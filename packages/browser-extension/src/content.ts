// Reaproveita 100% da lógica de captura/overlay do widget (packages/widget/src) —
// a diferença aqui é só de onde vem o token/endpoint (chrome.storage, configurado uma
// vez no popup) em vez de um data-attribute de <script>. Ativa em toda página aberta,
// sem exigir nenhuma edição no código do site.
import { mountWidget } from "../../widget/src/overlay.js";

interface Config {
  endpoint?: string;
  token?: string;
}

chrome.storage.sync.get(["endpoint", "token"], (cfg: Config) => {
  if (!cfg.endpoint || !cfg.token) return; // extensão instalada mas ainda não configurada

  const host = document.createElement("div");
  host.id = "annotate-ext-widget";
  document.documentElement.appendChild(host);

  mountWidget(host, async ({ message, annotation }) => {
    const res = await fetch(`${cfg.endpoint}/api/v1/annotations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.token}`,
      },
      body: JSON.stringify({ message, ...annotation }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[annotate] falha ao enviar anotação", text);
      throw new Error(text);
    }
  });
});
