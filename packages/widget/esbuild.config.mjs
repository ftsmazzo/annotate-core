import { build, context } from "esbuild";

const options = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "iife",
  target: "es2018",
  outfile: "dist/widget.js",
  minify: true,
};

if (process.argv.includes("--watch")) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("Widget: observando mudanças...");
} else {
  await build(options);
  console.log("Widget buildado em dist/widget.js");
}
