// Inlines dist/styles.css into every dist/*.html file that links it via
// <link rel="stylesheet" href="styles.css...">, then removes the now-unused
// styles.css. Fails the build loudly instead of silently shipping unstyled
// or half-updated pages.
const fs = require("fs");
const path = require("path");

const dist = process.argv[2] || "dist";
const cssPath = path.join(dist, "styles.css");

if (!fs.existsSync(cssPath)) {
  console.error(`ERROR: ${cssPath} not found -- nothing to inline.`);
  process.exit(1);
}
const css = fs.readFileSync(cssPath, "utf8");

const htmlFiles = fs.readdirSync(dist).filter((f) => f.endsWith(".html"));
const linkTagRe = /<link\b[^>]*>/gi;
let totalReplaced = 0;

for (const file of htmlFiles) {
  const filePath = path.join(dist, file);
  const original = fs.readFileSync(filePath, "utf8");
  let replacedInFile = 0;

  const updated = original.replace(linkTagRe, (tag) => {
    const isStylesheet = /rel=["']stylesheet["']/i.test(tag);
    const isStylesCss = /href=["']styles\.css(\?[^"']*)?["']/i.test(tag);
    if (isStylesheet && isStylesCss) {
      replacedInFile++;
      return `<style>\n${css}\n    </style>`;
    }
    return tag;
  });

  if (replacedInFile > 1) {
    console.error(
      `ERROR: ${file} has ${replacedInFile} <link> tags matching styles.css ` +
        `(expected at most 1). Refusing to guess which one is real.`,
    );
    process.exit(1);
  }
  if (replacedInFile === 1) {
    fs.writeFileSync(filePath, updated);
    totalReplaced++;
    console.log(`Inlined styles.css into ${file}`);
  }
}

if (totalReplaced === 0) {
  console.error(
    "ERROR: no HTML file in dist linked styles.css via " +
      '<link rel="stylesheet" href="styles.css...">. The markup may have ' +
      "changed shape -- fix this script rather than let it silently no-op.",
  );
  process.exit(1);
}

// Safety net: if any HTML file still mentions styles.css (a pattern this
// script didn't anticipate), leave the file in place rather than delete
// something that's still linked.
const stillReferenced = fs
  .readdirSync(dist)
  .filter((f) => f.endsWith(".html"))
  .some((f) => fs.readFileSync(path.join(dist, f), "utf8").includes("styles.css"));

if (stillReferenced) {
  console.error(
    "ERROR: a reference to styles.css remains in the built HTML after " +
      "inlining. Leaving dist/styles.css in place rather than deleting it.",
  );
  process.exit(1);
}

fs.unlinkSync(cssPath);
console.log(
  `Removed the now-unused ${cssPath} (inlined into ${totalReplaced} page(s)).`,
);
