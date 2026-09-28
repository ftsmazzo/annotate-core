import { buildUniqueSelector } from "./selector.js";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
import {
  captureBoundingBox,
  captureComputedStyles,
  captureDomPath,
  captureTextSnippet,
  tryGetReactComponentName,
} from "./capture.js";

export interface CapturedAnnotation {
  url: string;
  selector: string;
  domPath: ReturnType<typeof captureDomPath>;
  computedStyles: Record<string, string>;
  boundingBox: ReturnType<typeof captureBoundingBox>;
  elementTextSnippet?: string;
  metadata: {
    reactComponentName: string | null;
    viewport: { width: number; height: number };
    devicePixelRatio: number;
    userAgent: string;
  };
}

type SubmitHandler = (input: { message: string; annotation: CapturedAnnotation }) => Promise<void>;

/** Monta a UI do widget dentro de um Shadow DOM, isolada do CSS do site hospedeiro. */
export function mountWidget(host: HTMLElement, onSubmit: SubmitHandler, projectName?: string) {
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>${styles}</style>
    <button id="toggle" title="Reportar problema visual">${pencilIcon}</button>
    <div id="hover-box"></div>
    <div id="popover" hidden>
      ${projectName ? `<div id="project-badge">Reportando pro projeto: <strong>${escapeHtml(projectName)}</strong></div>` : ""}
      <textarea id="message" placeholder="O que está errado aqui?"></textarea>
      <div id="actions">
        <button id="cancel">Cancelar</button>
        <button id="send">Enviar</button>
      </div>
    </div>
  `;

  const toggleBtn = shadow.getElementById("toggle") as HTMLButtonElement;
  const hoverBox = shadow.getElementById("hover-box") as HTMLDivElement;
  const popover = shadow.getElementById("popover") as HTMLDivElement;
  const messageInput = shadow.getElementById("message") as HTMLTextAreaElement;
  const sendBtn = shadow.getElementById("send") as HTMLButtonElement;
  const cancelBtn = shadow.getElementById("cancel") as HTMLButtonElement;

  let selecting = false;
  let selectedEl: Element | null = null;

  function setSelecting(value: boolean) {
    selecting = value;
    toggleBtn.classList.toggle("active", value);
    document.body.style.cursor = value ? "crosshair" : "";
    hoverBox.style.display = value ? "block" : "none";
  }

  toggleBtn.addEventListener("click", () => setSelecting(!selecting));

  document.addEventListener(
    "mousemove",
    (e) => {
      if (!selecting) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || host.contains(el)) return;
      const rect = el.getBoundingClientRect();
      Object.assign(hoverBox.style, {
        display: "block",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    },
    true,
  );

  document.addEventListener(
    "click",
    (e) => {
      if (!selecting) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || host.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
      selectedEl = el;
      setSelecting(false);
      popover.hidden = false;
      messageInput.focus();
    },
    true,
  );

  cancelBtn.addEventListener("click", () => {
    popover.hidden = true;
    messageInput.value = "";
    selectedEl = null;
  });

  sendBtn.addEventListener("click", async () => {
    if (!selectedEl || !messageInput.value.trim()) return;
    const el = selectedEl;
    sendBtn.disabled = true;
    try {
      await onSubmit({
        message: messageInput.value.trim(),
        annotation: {
          url: location.href,
          selector: buildUniqueSelector(el),
          domPath: captureDomPath(el),
          computedStyles: captureComputedStyles(el),
          boundingBox: captureBoundingBox(el),
          elementTextSnippet: captureTextSnippet(el),
          metadata: {
            reactComponentName: tryGetReactComponentName(el),
            viewport: { width: window.innerWidth, height: window.innerHeight },
            devicePixelRatio: window.devicePixelRatio,
            userAgent: navigator.userAgent,
          },
        },
      });
      popover.hidden = true;
      messageInput.value = "";
      selectedEl = null;
      showToast(shadow, "Anotação enviada ✓", true);
    } catch {
      showToast(shadow, "Falha ao enviar — tente de novo", false);
    } finally {
      sendBtn.disabled = false;
    }
  });
}

function showToast(shadow: ShadowRoot, text: string, success: boolean) {
  const toast = document.createElement("div");
  toast.textContent = text;
  toast.className = `annotate-toast ${success ? "success" : "error"}`;
  shadow.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

const pencilIcon = `
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
      stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>
`;

const styles = `
  :host { all: initial; }
  #toggle {
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483000;
    width: 52px; height: 52px; border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #1f2937, #111827); color: #fff; cursor: pointer;
    box-shadow: 0 4px 14px rgba(0,0,0,.35);
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
  }
  #toggle:hover { transform: scale(1.08); box-shadow: 0 6px 18px rgba(0,0,0,.4); }
  #toggle.active {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    box-shadow: 0 0 0 4px rgba(37,99,235,.25), 0 4px 14px rgba(0,0,0,.35);
  }
  #hover-box {
    display: none; position: fixed; z-index: 2147482999; pointer-events: none;
    outline: 2px solid #2563eb; outline-offset: -1px; background: rgba(37,99,235,.08);
  }
  #popover {
    position: fixed; bottom: 80px; right: 20px; z-index: 2147483000;
    width: 280px; background: #fff; border-radius: 8px; padding: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,.25); font-family: system-ui, sans-serif;
  }
  #popover[hidden] { display: none; }
  #project-badge {
    font-size: 11px; color: #6b7280; margin-bottom: 6px; padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
  }
  textarea {
    width: 100%; height: 70px; box-sizing: border-box; padding: 8px;
    border: 1px solid #d1d5db; border-radius: 6px; font-family: inherit; resize: vertical;
  }
  #actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  #actions button {
    padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;
  }
  #cancel { background: #e5e7eb; }
  #send { background: #2563eb; color: #fff; }
  #send:disabled { opacity: .6; cursor: default; }
  .annotate-toast {
    position: fixed; bottom: 82px; right: 20px; z-index: 2147483000;
    padding: 10px 16px; border-radius: 8px; font-family: system-ui, sans-serif;
    font-size: 13px; color: #fff; box-shadow: 0 4px 14px rgba(0,0,0,.3);
    animation: annotate-toast-in .15s ease;
  }
  .annotate-toast.success { background: #16a34a; }
  .annotate-toast.error { background: #dc2626; }
  @keyframes annotate-toast-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
