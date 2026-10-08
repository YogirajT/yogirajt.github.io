import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const REPO = path.resolve(import.meta.dirname, "..", "..");
const BUILD_SCRIPT = path.join(REPO, ".github", "scripts", "build.mjs");

/** Copies what the generator reads (content/, src/, assets/, scripts.js, styles.css) to a temp dir, so tests can edit content freely. */
export function copyProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "site-test-"));
  for (const entry of ["content", "src", "assets", "scripts.js", "styles.css"]) fs.cpSync(path.join(REPO, entry), path.join(dir, entry), { recursive: true });
  return dir;
}

/** Runs the real generator against `dir`; returns { status, output, out } (out = directory with the generated site). */
export function build(dir) {
  const run = spawnSync(process.execPath, [BUILD_SCRIPT, "out"], { cwd: dir, encoding: "utf8", maxBuffer: 1 << 26 });
  return { status: run.status, output: `${run.stdout}\n${run.stderr}`, out: path.join(dir, "out") };
}

export const readText = (...p) => fs.readFileSync(path.join(...p), "utf8");
export const readJson = (...p) => JSON.parse(readText(...p));

export function readContent(dir) {
  const content = {};
  for (const f of fs.readdirSync(path.join(dir, "content")).filter((f) => f.endsWith(".json"))) {
    content[f.replace(/\.json$/, "")] = readJson(dir, "content", f);
  }
  return content;
}
export const writeContent = (dir, content) => {
  for (const [name, data] of Object.entries(content)) fs.writeFileSync(path.join(dir, "content", `${name}.json`), JSON.stringify(data, null, 2) + "\n");
};

/** Reads `const NAME = {...};` out of a generated page script (brace matching, string aware). */
export function readTable(code, name) {
  const marker = `const ${name} = `;
  const start = code.indexOf(marker) + marker.length;
  let depth = 0;
  let i = start;
  for (; i < code.length; i++) {
    const c = code[i];
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) { i++; break; }
    else if (c === '"') { i++; while (code[i] !== '"') { if (code[i] === "\\") i++; i++; } }
  }
  return { value: JSON.parse(code.slice(start, i)), start, end: i };
}
export function blankTables(code, names) {
  for (const n of names) {
    const { start, end } = readTable(code, n);
    code = code.slice(0, start) + "{}" + code.slice(end);
  }
  return code;
}

/** Site facts that appear in generated files; replaced by placeholders so changing them is not a "structure" change. */
export function placeholders(site) {
  return [
    [site.url, "«url»"], [site.email, "«email»"], [site.social.github, "«github»"], [site.social.linkedin, "«linkedin»"],
    [site.googleSiteVerification, "«verification»"], [site.theme.light, "«light»"], [site.theme.dark, "«dark»"],
  ].sort((a, b) => b[0].length - a[0].length);
}
export const withPlaceholders = (text, site) =>
  placeholders(site).reduce((t, [value, token]) => t.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), token), text);
