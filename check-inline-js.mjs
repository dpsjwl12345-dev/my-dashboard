import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const html = readFileSync("index.html", "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
if (!scripts.length) throw new Error("No inline scripts found");
for (const [index, source] of scripts.entries()) {
  const path = `/tmp/my-dashboard-inline-${index}.js`;
  writeFileSync(path, source);
  execFileSync(process.execPath, ["--check", path], { stdio: "inherit" });
}
console.log(`Checked ${scripts.length} inline script blocks.`);
