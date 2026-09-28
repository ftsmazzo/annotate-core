// Reaproveita 100% da lógica de captura/overlay do widget (packages/widget/src). Diferente
// da v1 (um token global pra qualquer aba), agora cada domínio tem seu próprio projeto
// configurado no popup — se o site atual não estiver mapeado, o lápis simplesmente não
// aparece, em vez de arriscar mandar a anotação pro projeto errado.
import { mountWidget } from "../../widget/src/overlay.js";

interface SiteMapping {
  hostname: string;
  endpoint: string;
  token: string;
}

function findMapping(mappings: SiteMapping[], hostname: string): SiteMapping | undefined {
  return mappings.find((m) => hostname === m.hostname || hostname.endsWith(`.${m.hostname}`));
}

/** Pede pro background capturar a aba (content script não tem acesso a chrome.tabs.*). */
function captureScreenshot(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "annotate:capture-screenshot" }, (response) => {
      if (chrome.runtime.lastError || !response?.dataUrl) {
        resolve(null);
        return;
      }
      resolve(response.dataUrl);
    });
  });
}

chrome.storage.sync.get(["mappings"], async (data: { mappings?: SiteMapping[] }) => {
  const mapping = findMapping(data.mappings ?? [], location.hostname);
  if (!mapping) return; // site não configurado — sem lápis, sem risco de mandar pro lugar errado

  let projectName: string | undefined;
  try {
    const whoami = await fetch(`${mapping.endpoint}/api/v1/whoami`, {
      headers: { authorization: `Bearer ${mapping.token}` },
    });
    if (whoami.ok) projectName = (await whoami.json()).name;
  } catch {
    // segue sem o nome exibido
  }

  const host = document.createElement("div");
  host.id = "annotate-ext-widget";
  document.documentElement.appendChild(host);

  mountWidget(
    host,
    async ({ message, annotation }) => {
      // Esconde o próprio widget (popover etc.) antes de capturar, senão a screenshot
      // vem com a nossa UI em cima em vez de só a página/bug reportado.
      const previousDisplay = host.style.display;
      host.style.display = "none";
      const screenshotDataUrl = await captureScreenshot();
      host.style.display = previousDisplay;

      const res = await fetch(`${mapping.endpoint}/api/v1/annotations`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${mapping.token}`,
        },
        body: JSON.stringify({
          message,
          ...annotation,
          ...(screenshotDataUrl ? { screenshotDataUrl } : {}),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[annotate] falha ao enviar anotação", text);
        throw new Error(text);
      }
    },
    projectName,
  );
});
