/**
 * Turns generated HTML into a "structure only" outline so snapshots ignore wording.
 *
 *   - every text node            -> ·   (and everything inside a data-i18n element, e.g. <strong>)
 *   - human-readable attributes  -> ·   (aria-label, alt, title, meta description / og:* / twitter:* ...)
 *   - cache-busting hashes       -> ?v=HASH
 *   - data-i18n keys             -> key *shapes*  (experience.jobs.*.bullets.*), so ids/order don't matter
 *   - svg diagrams               -> only their opening tag (the drawings are copied verbatim, not generated)
 *   - runs of identical siblings -> shown once    (jobs, bullets, tags, skill groups ... adding one changes nothing)
 *
 * No dependencies: the generated HTML is well-formed, so a small tokenizer is enough.
 */

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW_TEXT = new Set(["script", "style"]);
const TEXT_ATTRS = new Set(["aria-label", "alt", "title", "placeholder", "aria-description", "aria-roledescription"]);
const TEXT_META = new Set([
  "description", "author", "twitter:title", "twitter:description", "twitter:image:alt",
  "og:title", "og:description", "og:image:alt", "og:site_name", "profile:first_name", "profile:last_name",
]);
// attribute values that come from content ids; ignored when deciding whether siblings are "the same"
const VOLATILE = new Set(["id", "aria-labelledby", "aria-controls", "data-i18n", "data-i18n-attr", "data-arch-target", "data-arch-panel"]);

const TOKEN =
  /<!--[\s\S]*?-->|<!doctype[^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>|[^<]+|</gi;
const ATTR = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

export function parse(html) {
  const root = { tag: "#root", attrs: [], children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(html))) {
    const [all, closing, tag, rawAttrs, selfClose] = m;
    if (all.startsWith("<!--") || all.toLowerCase().startsWith("<!doctype")) continue;
    if (!tag) {
      if (all.trim()) top().children.push({ text: all });
      continue;
    }
    const name = tag.toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === name) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const attrs = [];
    for (const a of (rawAttrs || "").matchAll(ATTR)) attrs.push([a[1].toLowerCase(), a[2] ?? a[3] ?? a[4] ?? ""]);
    const node = { tag: name, attrs, children: [] };
    top().children.push(node);
    if (RAW_TEXT.has(name)) {
      const end = html.toLowerCase().indexOf(`</${name}>`, TOKEN.lastIndex);
      const stop = end === -1 ? html.length : end;
      node.children.push({ raw: html.slice(TOKEN.lastIndex, stop) });
      TOKEN.lastIndex = end === -1 ? html.length : end + name.length + 3;
      continue;
    }
    if (!VOID.has(name) && !selfClose) stack.push(node);
  }
  return root;
}

const collapse = (s) => s.replace(/\s+/g, " ").trim();
const stripJsComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");

/** key "experience.jobs.job2.bullets.0" -> "experience.jobs.*.bullets.*" (walks the content tree) */
export function keyShape(key, content) {
  const parts = key.split(".");
  let node = content[parts[0]];
  const out = [parts[0]];
  for (const part of parts.slice(1)) {
    if (Array.isArray(node)) {
      const i = node.findIndex((it, idx) => (it && typeof it === "object" && it.id === part) || String(idx) === part);
      if (i === -1) return key;
      out.push("*");
      node = node[i];
    } else if (node && typeof node === "object" && part in node) {
      out.push(part);
      node = node[part];
    } else return key;
  }
  return out.join(".");
}

function attrValue(node, name, value, ctx) {
  if (TEXT_ATTRS.has(name)) return "·";
  if (node.tag === "meta" && name === "content") {
    const id = node.attrs.find(([n]) => n === "name" || n === "property")?.[1];
    if (TEXT_META.has(id)) return "·";
  }
  if (name === "data-i18n") return ctx.shape ? ctx.shape(value) : value;
  if (name === "data-i18n-attr") {
    return value.split(";").map((p) => { const [a, k] = p.split(":"); return `${a}:${ctx.shape ? ctx.shape(k) : k}`; }).join(";");
  }
  return value.replace(/\?v=[0-9a-f]{6,}/g, "?v=HASH");
}

function openTag(node, ctx, compare) {
  const attrs = [...node.attrs].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const parts = attrs.map(([n, v]) => {
    if (compare && VOLATILE.has(n)) return n;
    const val = attrValue(node, n, v, ctx);
    return `${n}="${n === "class" ? collapse(val) : val}"`;
  });
  return `<${node.tag}${parts.length ? " " + parts.join(" ") : ""}>`;
}

function lines(node, ctx, compare) {
  if (node.text !== undefined) return collapse(node.text) ? ["·"] : [];
  if (node.raw !== undefined) return [];
  if (node.tag === "script") {
    const kind = node.attrs.find(([n]) => n === "type")?.[1];
    const body = node.children[0]?.raw ?? "";
    if (kind === "application/ld+json") return [openTag(node, ctx, compare), "  ‹json-ld: see its own snapshot›"];
    if (node.attrs.some(([n]) => n === "src")) return [openTag(node, ctx, compare)];
    return [openTag(node, ctx, compare), "  ‹" + collapse(stripJsComments(body)) + "›"];
  }
  if (node.tag === "style") return [openTag(node, ctx, compare), "  ‹" + collapse(node.children[0]?.raw ?? "") + "›"];
  const out = [openTag(node, ctx, compare)];
  if (node.tag === "svg") return out; // see header comment
  // A translatable element's whole content is wording, including inline <strong>: show it as one "·".
  if (node.attrs.some(([n]) => n === "data-i18n")) return [...out, "  ·"];
  if (VOID.has(node.tag)) return out;
  const kids = [];
  let last = null;
  for (const child of node.children) {
    const sig = lines(child, ctx, true).join("\n");
    if (sig === last) continue; // identical to the previous sibling: show once
    last = sig;
    kids.push(...lines(child, ctx, compare));
  }
  for (const k of kids) out.push("  " + k);
  return out;
}

/** html -> outline string. `content` (parsed content/*.json) lets data-i18n keys be shown as shapes. */
export function structure(html, content) {
  const ctx = { shape: content ? (k) => keyShape(k, content) : null };
  const root = parse(html);
  return root.children.flatMap((c) => lines(c, ctx, false)).join("\n") + "\n";
}

/** every id attribute and every in-page reference, for the anchor tests */
export function references(html) {
  const root = parse(html);
  const ids = new Set();
  const refs = [];
  (function walk(n) {
    for (const [name, value] of n.attrs || []) {
      if (name === "id") ids.add(value);
      if (name === "href" && value.startsWith("#") && value.length > 1) refs.push({ kind: "href", id: value.slice(1) });
      if (name === "aria-labelledby" || name === "aria-controls") value.split(/\s+/).forEach((id) => refs.push({ kind: name, id }));
    }
    (n.children || []).forEach(walk);
  })(root);
  return { ids, refs };
}
