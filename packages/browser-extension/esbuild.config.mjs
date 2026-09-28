import { build } from "esbuild";
import { mkdirSync, copyFileSync, createWriteStream } from "node:fs";
import { ZipArchive } from "archiver";

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

// Zip pronto pra baixar e "carregar sem compactação" — servido pelo próprio servidor
// em /extension.zip, pra distribuir pro time por link em vez de caminho de pasta local.
await new Promise((resolve, reject) => {
  const output = createWriteStream("annotate-extension.zip");
  const archive = new ZipArchive({ zlib: { level: 9 } });
  output.on("close", resolve);
  archive.on("error", reject);
  archive.pipe(output);
  // Nomeado (não "false") de propósito: sem isso, o zip solta os arquivos direto na pasta
  // onde a pessoa extrai ("Extrair aqui"), sem criar uma pasta própria — foi exatamente
  // o que aconteceu no teste real do usuário.
  archive.directory("dist/", "annotate-extension");
  archive.finalize();
});

console.log("Extensão buildada em packages/browser-extension/dist");
console.log("Zip pronto em packages/browser-extension/annotate-extension.zip");
