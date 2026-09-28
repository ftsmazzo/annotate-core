# Annotate — extensão de navegador

Ativa o lápis de anotação visual em qualquer site aberto no Chrome/Edge, sem precisar editar o código de nenhum site. Não é publicada na Chrome Web Store (revisão demora dias) — instala como extensão "unpacked" (modo desenvolvedor), leva 30 segundos.

## Build

```bash
pnpm --filter browser-extension build
```

Gera a pasta `dist/` com `manifest.json`, `content.js`, `popup.html`, `popup.js`.

## Instalar no Chrome ou Edge

1. Abra `chrome://extensions` (ou `edge://extensions`).
2. Ative "Modo do desenvolvedor" (canto superior direito).
3. Clique em "Carregar sem compactação" (Load unpacked).
4. Selecione a pasta `packages/browser-extension/dist`.
5. Clique no ícone da extensão na barra do navegador → cole o endpoint do servidor e o **token de widget** de um projeto (gerado em `/admin`) → Salvar.
6. Recarregue qualquer página — o lápis (✎) aparece no canto inferior direito, em qualquer site.

## Trocar de projeto

Abre o popup de novo e cola o token de widget de outro projeto — vale pra todas as abas depois de recarregar a página.
