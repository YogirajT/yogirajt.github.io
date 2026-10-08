#!/usr/bin/env node
/**
 * Site generator: content/*.json  +  src/*.njk  ->  dist/
 *
 *   node .github/scripts/build.mjs [outDir]        (default outDir: dist)
 *
 * Reads every content/*.json, resolves {{ tokens }} (name, role, city, years ...) per language,
 * renders the pages in src/ with Nunjucks, and writes:
 *   index.html, privacy.html, 404.html   English pages (data-i18n keys on every translatable element)
 *   i18n.js, privacy-i18n.js             the page scripts with their German table injected from content/
 *   sitemap.xml, robots.txt, assets/site.webmanifest   (all derived from content/site.json)
 *
 * Fails the build (non-zero exit) on: missing translations, unresolved tokens, keys used by the
 * page or scripts.js that do not exist in content. Prints warnings (not failures) for translations
 * nothing uses and for copy that still mentions a role term listed in site.json -> guard.stale.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import nunjucks from "nunjucks";

const ROOT = process.cwd();
const OUT = path.resolve(process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) || "dist");
const CONTENT = path.join(ROOT, "content");
const SRC = path.join(ROOT, "src");
const STRICT = process.argv.includes("--strict");
const WITH_STATIC = process.argv.includes("--with-static");

const errors = [];
const warnings = [];
const read = (p) => fs.readFileSync(p, "utf8");
const readJson = (p) => JSON.parse(read(p));
const write = (rel, data) => {
  const target = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
};

/* ------------------------------------------------------------------ helpers */
const isPlainObject = (o) => o && typeof o === "object" && !Array.isArray(o);
const isLeaf = (o) => {
  if (!isPlainObject(o)) return false;
  const k = Object.keys(o).sort().join();
  return k === "de,en" && typeof o.en === "string" && typeof o.de === "string";
};
const escapeHtml = (s) =>
  s
    .replace(/&(?!(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const toHtml = (s) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
const toText = (s) =>
  s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");

const env = nunjucks.configure(SRC, {
  autoescape: false,
  trimBlocks: true,
  lstripBlocks: true,
  throwOnUndefined: true,
});

/* ------------------------------------------------------------------ site + tokens */
const raw = {};
for (const f of fs.readdirSync(CONTENT).filter((f) => f.endsWith(".json")).sort()) {
  raw[f.replace(/\.json$/, "")] = readJson(path.join(CONTENT, f));
}
if (!raw.site) throw new Error("content/site.json is missing");
const S = raw.site;

/** Values available as {{ tokens }} inside any content string, per language. */
const tokenContext = (lang) => {
  const ctx = {
    name: `${S.firstName} ${S.lastName}`,
    firstName: S.firstName,
    lastName: S.lastName,
    years: S.years,
    employer: S.employer,
    level: S.level[lang],
    discipline: S.discipline[lang],
    city: S.city[lang],
    country: S.country,
  };
  ctx.role = {
    title: env.renderString(S.role.title[lang], ctx),
    seoTitle: env.renderString(S.role.seoTitle[lang], ctx),
  };
  return ctx;
};
const TOKENS = { en: tokenContext("en"), de: tokenContext("de") };
const renderTokens = (str, lang, where) => {
  if (!str.includes("{{")) return str;
  let out;
  try {
    out = env.renderString(str, TOKENS[lang]);
  } catch (e) {
    errors.push(`${where} [${lang}]: ${e.message}`);
    return str;
  }
  if (out.includes("{{")) errors.push(`${where} [${lang}]: unresolved token in "${out}"`);
  return out;
};

/* ------------------------------------------------------------------ content tree */
const leaves = new Map(); // key -> { key, en, de, enText, deText, raw }
const plainStrings = []; // [key, string] for the stale-term guard

function transform(node, parts) {
  const key = parts.join(".");
  if (isPlainObject(node)) {
    const ks = Object.keys(node);
    const langs = ks.filter((k) => k === "en" || k === "de");
    if (langs.length && langs.length === ks.length && langs.length < 2) {
      errors.push(`${key}: missing "${langs[0] === "en" ? "de" : "en"}" translation`);
      return { key, en: "", de: "", enText: "", deText: "", raw: { en: "", de: "" } };
    }
    if (langs.length === 2 && langs.some((k) => typeof node[k] !== "string")) {
      errors.push(`${key}: "en" and "de" must both be strings`);
      return { key, en: "", de: "", enText: "", deText: "", raw: { en: "", de: "" } };
    }
  }
  if (isLeaf(node)) {
    const en = renderTokens(node.en, "en", key);
    const de = renderTokens(node.de, "de", key);
    const leaf = { key, en: toHtml(en), de: toHtml(de), enText: toText(en), deText: toText(de), raw: node };
    leaves.set(key, leaf);
    return leaf;
  }
  if (isPlainObject(node) && Object.keys(node).join() === "text" && typeof node.text === "string") {
    // {"text": "..."}: same in every language, no data-i18n attribute is emitted (leaf.key is null)
    const text = renderTokens(node.text, "en", key);
    return { key: null, en: toHtml(text), de: toHtml(text), enText: toText(text), deText: toText(text) };
  }
  if (Array.isArray(node)) {
    return node.map((item, i) => {
      const seg = isPlainObject(item) && typeof item.id === "string" ? item.id : String(i);
      const out = transform(item, [...parts, seg]);
      if (isPlainObject(out) && !out.key) {
        out._index = i;
        out._num = String(i + 1).padStart(2, "0");
        out._first = i === 0;
        out._last = i === node.length - 1;
      }
      return out;
    });
  }
  if (isPlainObject(node)) {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = transform(v, [...parts, k]);
    return out;
  }
  if (typeof node === "string") {
    plainStrings.push([key, node]);
    return renderTokens(node, "en", key);
  }
  return node;
}

const data = {};
for (const [name, tree] of Object.entries(raw)) data[name] = transform(tree, [name]);
data.site.name = TOKENS.en.name;

/* ------------------------------------------------------------------ cache-busting hashes */
const sha = (...buffers) => {
  const h = crypto.createHash("sha1");
  buffers.forEach((b) => h.update(b));
  return h.digest("hex").slice(0, 8);
};
const contentBlob = Object.keys(raw).map((n) => read(path.join(CONTENT, `${n}.json`))).join("\n");
const hash = {
  styles: sha(fs.readFileSync(path.join(ROOT, "styles.css"))),
  scripts: sha(fs.readFileSync(path.join(ROOT, "scripts.js"))),
  i18n: sha(read(path.join(SRC, "i18n.js")), contentBlob),
  privacyI18n: sha(read(path.join(SRC, "privacy-i18n.js")), contentBlob),
};

/* ------------------------------------------------------------------ structured data */
const url = S.url.replace(/\/$/, "");
const ld = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${url}/#website`,
      url: `${url}/`,
      name: data.site.name,
      inLanguage: ["en", "de"],
      publisher: { "@id": `${url}/#person` },
    },
    {
      "@type": "ProfilePage",
      "@id": `${url}/#profilepage`,
      url: `${url}/`,
      name: data.seo.title.enText,
      inLanguage: "en",
      isPartOf: { "@id": `${url}/#website` },
      mainEntity: { "@id": `${url}/#person` },
    },
    {
      "@type": "Person",
      "@id": `${url}/#person`,
      name: data.site.name,
      alternateName: S.alternateName,
      url: `${url}/`,
      jobTitle: TOKENS.en.role.seoTitle,
      description: data.seo.ogDescription.enText,
      email: `mailto:${S.email}`,
      address: { "@type": "PostalAddress", addressLocality: S.city.en, addressCountry: S.country.code },
      worksFor: { "@type": "Organization", name: S.employer },
      alumniOf: raw.education.degrees
        .filter((d) => d.alumni)
        .map((d) => ({ "@type": "CollegeOrUniversity", name: d.institution })),
      knowsLanguage: raw.education.languages.map((l) => l.name.text ?? l.name.en),
      knowsAbout: S.knowsAbout,
      mainEntityOfPage: { "@id": `${url}/#profilepage` },
      sameAs: Object.values(S.social),
    },
  ],
};
const ldJson = JSON.stringify(ld, null, 2).replace(/</g, "\\u003c");

/* ------------------------------------------------------------------ render the pages */
const PAGES = [
  {
    name: "index",
    template: "index.njk",
    out: "index.html",
    script: { template: "i18n.js", out: "i18n.js" },
    // links that differ because the privacy page lives at another URL
    ctx: { base: "", cookiePolicyHref: "privacy.html", enHref: "./" },
  },
  {
    name: "privacy",
    template: "privacy.njk",
    out: "privacy.html",
    script: { template: "privacy-i18n.js", out: "privacy-i18n.js" },
    ctx: { base: "index.html", cookiePolicyHref: "#policy", enHref: "privacy.html" },
  },
  { name: "404", template: "404.njk", out: "404.html", ctx: {} },
];
const buildYear = new Date().getUTCFullYear();
for (const page of PAGES) {
  page.html = "";
  if (errors.length) continue;
  try {
    page.html = env.render(page.template, { ...data, hash, ldJson, buildYear, page: { name: page.name, ...page.ctx } });
  } catch (e) {
    errors.push(`${page.template}: ${e.message}`);
  }
}

/* ------------------------------------------------------------------ translation tables */
const keysIn = (html) => {
  const text = new Set([...html.matchAll(/\sdata-i18n="([^"]+)"/g)].map((m) => m[1]));
  const attr = new Set();
  for (const m of html.matchAll(/\sdata-i18n-attr="([^"]+)"/g)) m[1].split(";").forEach((pair) => attr.add(pair.split(":")[1]));
  return { text, attr };
};
for (const page of PAGES) Object.assign(page, keysIn(page.html));
const home = PAGES[0];

// Keys scripts.js asks for at run time: t("ui.messages.archPlay", "fallback")
const runtimeKeys = new Set(
  [...read(path.join(ROOT, "scripts.js")).matchAll(/(?<![\w.$])t\(\s*"((?:ui|seo)\.[^"]+)"/g)].map((m) => m[1]),
);
const headKeys = ["seo.title", "seo.description", "seo.ogTitle", "seo.ogDescription", "seo.ogImageAlt", "seo.locale"];
const announceKey = "ui.messages.langChanged";

if (!errors.length) {
  for (const k of [...PAGES.flatMap((p) => [...p.text, ...p.attr]), ...runtimeKeys, ...headKeys, announceKey]) {
    if (!leaves.has(k)) errors.push(`key "${k}" is used by a page or scripts.js but does not exist in content/`);
  }
}

// Home page table: everything the page, scripts.js and the <head> need.
const DE = {};
const EN = {};
const used = new Set([...runtimeKeys, ...headKeys, announceKey]);
for (const page of PAGES) [...page.text, ...page.attr].forEach((k) => used.add(k));
for (const [k, leaf] of leaves) {
  if (k.startsWith("site.")) continue;
  const isText = home.text.has(k);
  const isOther = home.attr.has(k) || runtimeKeys.has(k) || headKeys.includes(k);
  if (isText) DE[k] = leaf.de;
  else if (isOther) DE[k] = leaf.deText;
  if (runtimeKeys.has(k)) EN[k] = leaf.enText;
  if (!errors.length && !used.has(k) && !k.startsWith("seo.")) {
    warnings.push(`unused translation: ${k}  (no page or script references it)`);
  }
}
if (!errors.length) {
  DE["seo.localeAlt"] = leaves.get("seo.locale").raw.en; // the alternate locale on the German page is the English one
  DE["seo.jobTitle"] = TOKENS.de.role.seoTitle; // JSON-LD jobTitle in German
}
const ANNOUNCEMENTS = errors.length ? {} : { en: leaves.get(announceKey).enText, de: leaves.get(announceKey).deText };

// Privacy page table: only what that page references (text keys keep their HTML form).
const DE_PRIVACY = {};
for (const page of [PAGES[1]]) {
  for (const k of [...page.text, ...page.attr]) {
    const leaf = leaves.get(k);
    if (leaf) DE_PRIVACY[k] = page.text.has(k) ? leaf.de : leaf.deText;
  }
}

/* ------------------------------------------------------------------ page scripts (i18n.js, privacy-i18n.js) */
const inject = (file, tables) => {
  let code = read(path.join(SRC, file));
  for (const [ph, value] of Object.entries(tables)) {
    const marker = `/*${ph}*/{}`;
    if (code.split(marker).length !== 2) errors.push(`src/${file} must contain ${marker} exactly once`);
    code = code.replace(marker, () => JSON.stringify(value, null, 2).replace(/\n/g, "\n  "));
  }
  return code;
};
PAGES[0].scriptCode = inject("i18n.js", { __DE__: DE, __EN__: EN, __ANNOUNCEMENTS__: ANNOUNCEMENTS });
PAGES[1].scriptCode = inject("privacy-i18n.js", { __DE__: DE_PRIVACY });

/* ------------------------------------------------------------------ sitemap, robots, manifest */
// lastmod = date of the last commit that touched the files behind each URL (falls back to today when git
// history is unavailable). The workflow checks out full history so this is accurate.
const today = new Date().toISOString().slice(0, 10);
const lastModified = (paths, exclude = []) => {
  try {
    const spec = [...paths, ...exclude.map((e) => `:(exclude)${e}`)];
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...spec], { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return out || today;
  } catch {
    return today;
  }
};
const PRIVACY_FILES = ["content/privacy.json", "src/privacy.njk", "src/privacy-i18n.js"];
const lastmod = {
  home: lastModified(["content", "src", "styles.css", "scripts.js"], [...PRIVACY_FILES, "content/notFound.json", "src/404.njk"]),
  cv: lastModified(["assets/cv.pdf"]),
  privacy: lastModified([...PRIVACY_FILES, "src/partials", "content/ui.json"]),
};
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url}/</loc>
    <lastmod>${lastmod.home}</lastmod>
    <priority>1.00</priority>
  </url>
  <url>
    <loc>${url}/assets/cv.pdf</loc>
    <lastmod>${lastmod.cv}</lastmod>
    <priority>0.50</priority>
  </url>
  <url>
    <loc>${url}/privacy.html</loc>
    <lastmod>${lastmod.privacy}</lastmod>
    <priority>0.10</priority>
  </url>
</urlset>
`;
const robots = `User-agent: *\nDisallow: /assets/fonts/\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n`;
const manifest =
  JSON.stringify(
    {
      name: `${data.site.name} — ${TOKENS.en.role.title}`,
      short_name: data.site.name,
      icons: [
        { src: "/assets/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/assets/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      ],
      theme_color: S.theme.dark,
      background_color: S.theme.dark,
      display: "standalone",
    },
    null,
    2,
  ) + "\n";

/* ------------------------------------------------------------------ stale-term guard */
const stale = (S.guard?.stale || []).map((t) => t.toLowerCase());
const allowIn = S.guard?.allowIn || [];
if (stale.length) {
  const hit = (s) => stale.find((t) => s.toLowerCase().includes(t));
  for (const [k, leaf] of leaves) {
    if (k.startsWith("site.") || allowIn.some((p) => k.startsWith(p))) continue;
    for (const lang of ["en", "de"]) {
      const t = hit(leaf.raw[lang]);
      if (t) warnings.push(`stale term "${t}" in ${k} [${lang}]: ${leaf.raw[lang].slice(0, 90)}`);
    }
  }
  for (const [k, s] of plainStrings) {
    if (k.startsWith("site.") || allowIn.some((p) => k.startsWith(p))) continue;
    const t = hit(s);
    if (t) warnings.push(`stale term "${t}" in ${k}: ${s.slice(0, 90)}`);
  }
  const scan = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(njk|html|js)$/.test(e.name)) scan.push(p);
    }
  };
  walk(SRC);
  for (const f of scan) {
    read(f).split("\n").forEach((line, i) => {
      const t = hit(line);
      if (t) warnings.push(`stale term "${t}" hard-coded in ${path.relative(ROOT, f)}:${i + 1}`);
    });
  }
}

/* ------------------------------------------------------------------ report + write */
const annotate = (level, msg) => console.log(process.env.GITHUB_ACTIONS ? `::${level}::${msg}` : `${level.toUpperCase()}: ${msg}`);
warnings.forEach((w) => annotate("warning", w));
errors.forEach((e) => annotate("error", e));
if (errors.length || (STRICT && warnings.length)) {
  console.error(`\nBuild failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
if (WITH_STATIC) {
  // Local preview: copy everything that is not source/tooling next to the generated files.
  const skip = new Set(["src", "content", "tests", "node_modules", "dist", ".git", ".github", ".gitignore", "package.json", "package-lock.json", "README.md", "LICENSE", ".DS_Store"]);
  for (const entry of fs.readdirSync(ROOT)) if (!skip.has(entry) && path.resolve(ROOT, entry) !== OUT) fs.cpSync(path.join(ROOT, entry), path.join(OUT, entry), { recursive: true });
}
for (const page of PAGES) {
  write(page.out, page.html);
  if (page.script) write(page.script.out, page.scriptCode);
}
write("sitemap.xml", sitemap);
write("robots.txt", robots);
write("assets/site.webmanifest", manifest);
console.log(
  `Built ${path.relative(ROOT, OUT) || "."}: ${PAGES.length} pages, ${leaves.size} translatable strings ` +
    `(${Object.keys(DE).length} German entries on the home page, ${Object.keys(DE_PRIVACY).length} on the privacy page), ${warnings.length} warning(s).`,
);
