import { mountWidget } from "./overlay.js";

function getCurrentScript(): HTMLScriptElement | null {
  return document.currentScript as HTMLScriptElement | null;
}

function init() {
  const script = getCurrentScript();
  const projectToken = script?.dataset.project;
  const endpoint = script?.dataset.endpoint ?? new URL(script?.src ?? location.href).origin;

  if (!projectToken) {
    console.error(
      "[annotate-core] widget carregado sem data-project — veja https://<seu-dominio>/docs",
    );
    return;
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
      console.error("[annotate-core] falha ao enviar anotação", await res.text());
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
