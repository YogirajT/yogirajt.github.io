/**
 * Snapshot + invariant tests for the generated site.
 *
 * What they protect: everything that is NOT wording - markup, attributes, links, ids, translation-key
 * wiring, structured data, sitemap/manifest shape, the language scripts. Wording is masked, so editing
 * content/*.json never needs a snapshot update; changing templates, build.mjs or the scripts does.
 *
 *   npm test                 compare with tests/__snapshots__
 *   npm run test:update      accept an intended structural change (review the git diff!)
 */
import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { structure, references, keyShape } from "./helpers/structure.mjs";
import { build, copyProject, readContent, readJson, readText, writeContent, readTable, blankTables, withPlaceholders } from "./helpers/site.mjs";
import { matchSnapshot } from "./helpers/snapshot.mjs";

const PAGES = ["index.html", "privacy.html", "404.html"];
const SCRIPTS = { "i18n.js": ["DE", "EN", "ANNOUNCEMENTS"], "privacy-i18n.js": ["DE"] };
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ------------------------------------------------------------------ the pieces every snapshot is made of */
function snapshots(dir, out, content) {
  const site = content.site;
  const sp = (text) => withPlaceholders(text, site);
  const result = {};
  for (const page of PAGES) result[`${page}.txt`] = sp(structure(readText(out, page), content));

  const tables = {};
  for (const [file, names] of Object.entries(SCRIPTS)) {
    const code = readText(out, file);
    const de = readTable(code, "DE").value;
    tables[file] = Object.keys(de);
    result[`${file}.engine.txt`] = sp(blankTables(code, names).replace(/\?v=[0-9a-f]{6,}/g, "?v=HASH"));
    result[`${file}.keys.txt`] = [...new Set(Object.keys(de).map((k) => keyShape(k, content)))].sort().join("\n") + "\n";
  }

  result["json-ld.txt"] = sp(JSON.stringify(maskLd(JSON.parse(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/.exec(readText(out, "index.html"))[1])), null, 2)) + "\n";
  result["sitemap.xml.txt"] = sp(readText(out, "sitemap.xml").replace(/<lastmod>[^<]*<\/lastmod>/g, "<lastmod>YYYY-MM-DD</lastmod>"));
  result["robots.txt.txt"] = sp(readText(out, "robots.txt"));
  const manifest = readJson(out, "assets", "site.webmanifest");
  manifest.name = "·";
  manifest.short_name = "·";
  result["site.webmanifest.txt"] = sp(JSON.stringify(manifest, null, 2)) + "\n";
  return { result, tables };
}

const LD_KEEP = new Set(["@context", "@type", "@id", "url", "mainEntityOfPage", "sameAs", "email", "addressCountry", "inLanguage"]);
function maskLd(node, key = "") {
  if (Array.isArray(node)) {
    const items = node.map((n) => maskLd(n, key));
    return items.filter((v, i) => i === 0 || JSON.stringify(v) !== JSON.stringify(items[i - 1]));
  }
  if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, maskLd(v, k)]));
  return typeof node === "string" && !LD_KEEP.has(key) ? "·" : node;
}

/** Same content, different wording (every translatable string gets a suffix) + different site facts. */
function rewriteWording(content) {
  const SKIP = new Set(["id", "type", "place", "level"]); // string fields that are identifiers, not wording
  const mutate = (node, p) => {
    if (Array.isArray(node)) return node.map((n, i) => mutate(n, `${p}.${i}`));
    if (node && typeof node === "object") {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => {
        const here = `${p}.${k}`;
        if (typeof v === "string") {
          const structural = SKIP.has(k) || here.startsWith("seo.locale") || here.startsWith("site.guard") || here.startsWith("site.social") || here.startsWith("site.theme") ||
            ["site.url", "site.email", "site.googleSiteVerification", "site.country.code"].includes(here);
          return [k, structural ? v : v + " ✓"];
        }
        return [k, mutate(v, here)];
      }));
    }
    return node;
  };
  const out = Object.fromEntries(Object.entries(content).map(([name, tree]) => [name, mutate(tree, name)]));
  Object.assign(out.site, {
    url: "https://example.test",
    email: "someone@example.test",
    googleSiteVerification: "TOKEN-TOKEN-TOKEN",
    social: { github: "https://github.com/example-user", linkedin: "https://www.linkedin.com/in/example-user/" },
    theme: { light: "#fafafa", dark: "#010101" },
  });
  return out;
}

/** Same content plus new entries that use layouts which already exist (a job, bullet, skill group, tag ...). */
function addEntries(content, dir) {
  const c = clone(content);
  const last = (a) => clone(a[a.length - 1]);
  const jobs = c.experience.jobs;
  jobs.push({ ...last(jobs), id: "job-test" });
  jobs[0].bullets.push(last(jobs[0].bullets));
  jobs[0].tags.push("Another Tag");
  c.experience.earlier.push({ ...last(c.experience.earlier), id: "e-test" });
  c.skills.groups.push({ ...last(c.skills.groups), id: "g-test" });
  c.skills.groups[0].tags.push("Another Tag");
  c.about.paragraphs.push(last(c.about.paragraphs));
  c.about.facts.push(last(c.about.facts));
  c.education.degrees.push(last(c.education.degrees));
  c.education.languages.push(last(c.education.languages));
  const sections = c.privacy.sections;
  sections.push({ ...last(sections), id: "zz-test" });
  sections[1].blocks.push(last(sections[1].blocks));
  const list = sections.find((s) => s.id === "rights").blocks.find((b) => b.type === "list");
  list.points.push(last(list.points));
  const arch = c.hero.architectures;
  arch.push({ ...last(arch), id: "zz-test" });
  fs.copyFileSync(path.join(dir, "src", "diagrams", "layered.html"), path.join(dir, "src", "diagrams", "zz-test.html"));
  return c;
}

/* ------------------------------------------------------------------ tests */
describe("generated site", () => {
  let base; // { dir, out, content, snaps }
  before(() => {
    const dir = copyProject();
    const run = build(dir);
    assert.equal(run.status, 0, run.output);
    const content = readContent(dir);
    base = { dir, ...run, content, snaps: snapshots(dir, run.out, content), run };
  });

  test("the build succeeds without warnings", () => {
    assert.doesNotMatch(base.run.output, /WARNING|::warning::/, base.run.output);
  });

  test("no template leftovers in any page", () => {
    for (const page of PAGES) {
      const html = readText(base.out, page);
      assert.doesNotMatch(html, /\{\{|\{%|\[object Object\]|>\s*undefined\s*<|="undefined"|>\s*null\s*</, `${page} contains template leftovers`);
    }
  });

  test("every in-page link and aria reference points at an existing id", () => {
    for (const page of PAGES) {
      const { ids, refs } = references(readText(base.out, page));
      const missing = refs.filter((r) => !ids.has(r.id)).map((r) => `${r.kind} -> #${r.id}`);
      assert.deepEqual(missing, [], `${page}: dangling references`);
    }
  });

  test("every data-i18n key used by a page exists in that page's German table", () => {
    for (const [page, script] of [["index.html", "i18n.js"], ["privacy.html", "privacy-i18n.js"]]) {
      const html = readText(base.out, page);
      const table = readTable(readText(base.out, script), "DE").value;
      const used = new Set([...html.matchAll(/\sdata-i18n="([^"]+)"/g)].map((m) => m[1]));
      for (const m of html.matchAll(/\sdata-i18n-attr="([^"]+)"/g)) m[1].split(";").forEach((p) => used.add(p.split(":")[1]));
      const missing = [...used].filter((k) => !(k in table));
      assert.deepEqual(missing, [], `${page}: keys missing from ${script}`);
    }
  });

  describe("snapshots (wording masked)", () => {
    for (const name of Object.keys({
      "index.html.txt": 1, "privacy.html.txt": 1, "404.html.txt": 1,
      "i18n.js.engine.txt": 1, "i18n.js.keys.txt": 1, "privacy-i18n.js.engine.txt": 1, "privacy-i18n.js.keys.txt": 1,
      "json-ld.txt": 1, "sitemap.xml.txt": 1, "robots.txt.txt": 1, "site.webmanifest.txt": 1,
    })) {
      test(name, () => matchSnapshot(name, base.snaps.result[name]));
    }
  });

  describe("only wording changed => nothing else changes", () => {
    test("rewording every string and changing url/e-mail/links/colours leaves all snapshots identical", () => {
      const dir = copyProject();
      writeContent(dir, rewriteWording(base.content));
      const run = build(dir);
      assert.equal(run.status, 0, run.output);
      const { result } = snapshots(dir, run.out, readContent(dir));
      for (const [name, text] of Object.entries(base.snaps.result)) assert.ok(result[name] === text, `${name} changed although only wording/site facts changed`);
    });
  });

  describe("adding entries with existing layouts => nothing else changes", () => {
    test("new job, bullet, tag, skill group, fact, degree, language, policy section/paragraph/point, diagram", () => {
      const dir = copyProject();
      const extended = addEntries(base.content, dir);
      writeContent(dir, extended);
      const run = build(dir);
      assert.equal(run.status, 0, run.output);
      const { result } = snapshots(dir, run.out, readContent(dir));
      for (const name of ["index.html.txt", "privacy.html.txt", "404.html.txt", "i18n.js.keys.txt", "privacy-i18n.js.keys.txt", "json-ld.txt"]) {
        assert.ok(result[name] === base.snaps.result[name], `${name} changed after adding ordinary entries`);
      }
      assert.match(readText(run.out, "index.html"), /data-arch-panel/, "sanity: page rendered");
    });
  });

  describe("the build refuses broken content", () => {
    test("a string without its German translation", () => {
      const dir = copyProject();
      const c = readContent(dir);
      delete c.about.paragraphs[1].de;
      writeContent(dir, c);
      const run = build(dir);
      assert.notEqual(run.status, 0);
      assert.match(run.output, /about\.paragraphs\.1/);
    });
    test("an unknown {{ token }}", () => {
      const dir = copyProject();
      const c = readContent(dir);
      c.skills.eyebrow.en += " {{ doesNotExist }}";
      writeContent(dir, c);
      const run = build(dir);
      assert.notEqual(run.status, 0);
      assert.match(run.output, /skills\.eyebrow/);
    });
  });
});
