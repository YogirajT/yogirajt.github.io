import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve(import.meta.dirname, "..", "__snapshots__");
const UPDATE = process.env.UPDATE_SNAPSHOTS === "1";

function firstDifference(expected, actual) {
  const a = expected.split("\n");
  const b = actual.split("\n");
  let i = 0;
  while (i < Math.max(a.length, b.length) && a[i] === b[i]) i++;
  const ctx = (arr) => arr.slice(Math.max(0, i - 2), i + 4).map((l, k) => `${String(Math.max(0, i - 2) + k + 1).padStart(4)} | ${l}`).join("\n");
  return `first difference at line ${i + 1}\n\n--- snapshot\n${ctx(a)}\n\n+++ generated now\n${ctx(b)}`;
}

/** Compares `actual` with tests/__snapshots__/<name>. Run `npm run test:update` to accept an intended change. */
export function matchSnapshot(name, actual) {
  const file = path.join(DIR, name);
  if (UPDATE) {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(file, actual);
    return;
  }
  assert.ok(fs.existsSync(file), `No snapshot ${name}. Run "npm run test:update" once to create it.`);
  const expected = fs.readFileSync(file, "utf8");
  assert.ok(expected === actual, `${name} changed: ${firstDifference(expected, actual)}\n\nIf this change is intended: npm run test:update`);
}
