import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const distDir = path.join(repoRoot, "dist");
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "manifest.json"), "utf-8"));
const outName = `${manifest.id}-${manifest.version}.zip`;
const outPath = path.join(repoRoot, outName);

const requiredEntries = ["main.js", "styles.css", "manifest.json", "python"];

for (const entry of requiredEntries) {
  if (!fs.existsSync(path.join(distDir, entry))) {
    console.error(`dist 산출물이 없습니다: ${entry}\n먼저 npm run build 를 실행하세요.`);
    process.exit(1);
  }
}

fs.rmSync(outPath, { force: true });

const entries = requiredEntries.map((e) => {
  const stat = fs.statSync(path.join(distDir, e));
  return stat.isDirectory() ? `${e}/` : e;
});

execSync(`zip -r "${outPath}" ${entries.join(" ")}`, { cwd: distDir, stdio: "inherit" });

console.log(`\nPacked: ${outName}`);
