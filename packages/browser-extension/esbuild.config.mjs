import { build } from "esbuild";
import { mkdirSync, copyFileSync } from "node:fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/content.ts"],
  bundle: true,
  format: "iife",
  target: "es2018",
  outfile: "dist/content.js",
});

await build({
  entryPoints: ["src/popup.ts"],
  bundle: true,
  format: "iife",
  target: "es2018",
  outfile: "dist/popup.js",
});

copyFileSync("manifest.json", "dist/manifest.json");
copyFileSync("popup.html", "dist/popup.html");

console.log("Extensão buildada em packages/browser-extension/dist");
