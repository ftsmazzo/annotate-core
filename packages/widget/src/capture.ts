const STYLE_KEYS = [
  "display",
  "position",
  "top",
  "left",
  "width",
  "height",
  "margin",
  "padding",
  "color",
  "backgroundColor",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "border",
  "borderRadius",
  "boxShadow",
  "flexDirection",
  "justifyContent",
  "alignItems",
  "gridTemplateColumns",
  "zIndex",
  "opacity",
] as const;

export function captureComputedStyles(el: Element): Record<string, string> {
  const computed = getComputedStyle(el);
  const result: Record<string, string> = {};
  for (const key of STYLE_KEYS) {
    const value = computed[key as keyof CSSStyleDeclaration];
    if (typeof value === "string" && value) result[key] = value;
  }
  return result;
}

export function captureBoundingBox(el: Element) {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

export function captureDomPath(el: Element) {
  const path: Array<{ tag: string; id: string | null; classes: string[]; index: number }> = [];
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    const parent: Element | null = current.parentElement;
    const siblings = parent ? Array.from(parent.children) : [current];
    path.unshift({
      tag: current.tagName.toLowerCase(),
      id: current.id || null,
      classes: Array.from(current.classList),
      index: siblings.indexOf(current),
    });
    current = parent;
  }
  return path;
}

export function captureTextSnippet(el: Element, maxLength = 300): string | undefined {
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ");
  if (!text) return undefined;
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

/**
 * Best-effort: só funciona em apps React com DevTools instalado/hook presente.
 * Nunca é obrigatório — em qualquer outra stack retorna null e degrada graciosamente.
 */
export function tryGetReactComponentName(el: Element): string | null {
  const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook) return null;
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  if (!key) return null;
  let fiber = (el as any)[key];
  for (let i = 0; i < 10 && fiber; i++) {
    const name = fiber.type?.displayName || fiber.type?.name;
    if (typeof name === "string" && name[0] === name[0]?.toUpperCase()) return name;
    fiber = fiber.return;
  }
  return null;
}
