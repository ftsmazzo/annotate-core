import { buildUniqueSelector } from "./selector.js";
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
export function mountWidget(host: HTMLElement, onSubmit: SubmitHandler) {
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>${styles}</style>
    <button id="toggle" title="Reportar problema visual">✎</button>
    <div id="hover-box"></div>
    <div id="popover" hidden>
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
    } finally {
      sendBtn.disabled = false;
    }
  });
}

const styles = `
  :host { all: initial; }
  #toggle {
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483000;
    width: 48px; height: 48px; border-radius: 50%; border: none;
    background: #111827; color: #fff; font-size: 20px; cursor: pointer;
    box-shadow: 0 2px 10px rgba(0,0,0,.3);
  }
  #toggle.active { background: #2563eb; }
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
`;
