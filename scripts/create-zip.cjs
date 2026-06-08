const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const rootDir = process.cwd();
const outputPath = path.join(rootDir, "release.zip");

if (fs.existsSync(outputPath)) {
  fs.rmSync(outputPath, { force: true });
}

const includePaths = [
  ".\\src",
  ".\\public",
  ".\\supabase",
  ".\\index.html",
  ".\\package.json",
  ".\\tsconfig.json",
  ".\\tsconfig.app.json",
  ".\\tsconfig.node.json",
  ".\\vite.config.ts",
  ".\\tailwind.config.ts",
  ".\\postcss.config.js",
  ".\\components.json",
  ".\\eslint.config.js",
  ".\\README.md",
  ".\\netlify.toml",
  ".\\vercel.json",
  ".\\fix-database.sql",
  ".\\playwright.config.ts",
  ".\\playwright-fixture.ts",
];

const command = `Compress-Archive -Path ${includePaths.join(",") } -DestinationPath "${outputPath}" -Force`;
const result = spawnSync("powershell", ["-NoProfile", "-Command", command], {
  cwd: rootDir,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status);
}

console.log(`Created archive: ${outputPath}`);
