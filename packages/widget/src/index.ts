import { mountWidget } from "./overlay.js";

function getCurrentScript(): HTMLScriptElement | null {
  return document.currentScript as HTMLScriptElement | null;
}

async function init() {
  const script = getCurrentScript();
  const projectToken = script?.dataset.project;
  const endpoint = script?.dataset.endpoint ?? new URL(script?.src ?? location.href).origin;

  if (!projectToken) {
    console.error(
      "[annotate-core] widget carregado sem data-project — veja https://<seu-dominio>/docs",
    );
    return;
  }

  // Mostra "reportando pro projeto: X" antes de enviar — evita confusão quando
  // a mesma pessoa tem tokens de mais de um projeto configurados em lugares diferentes.
  let projectName: string | undefined;
  try {
    const whoami = await fetch(`${endpoint}/api/v1/whoami`, {
      headers: { authorization: `Bearer ${projectToken}` },
    });
    if (whoami.ok) projectName = (await whoami.json()).name;
  } catch {
    // Sem nome exibido não impede o uso — só perde a confirmação visual extra.
  }

  const host = document.createElement("div");
  host.id = "annotate-core-widget";
  document.documentElement.appendChild(host);

  mountWidget(host, async ({ message, annotation }) => {
    const res = await fetch(`${endpoint}/api/v1/annotations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${projectToken}`,
      },
      body: JSON.stringify({ message, ...annotation }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[annotate-core] falha ao enviar anotação", text);
      throw new Error(text);
    }
  }, projectName);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
