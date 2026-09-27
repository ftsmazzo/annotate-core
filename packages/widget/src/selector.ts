/**
 * Gera um seletor CSS único para um elemento, sem depender de nenhum framework.
 * Ordem de tentativa: id -> data-testid/data-* estáveis -> classes -> nth-of-type a partir do body.
 * Cada candidato é validado com querySelectorAll(...).length === 1 antes de aceitar.
 */
export function buildUniqueSelector(el: Element): string {
  if (isUnique(`#${cssEscape(el.id)}`) && el.id) {
    return `#${cssEscape(el.id)}`;
  }

  const stableAttr = findStableAttributeSelector(el);
  if (stableAttr && isUnique(stableAttr)) return stableAttr;

  const classSelector = buildClassSelector(el);
  if (classSelector && isUnique(classSelector)) return classSelector;

  return buildNthPathSelector(el);
}

function isUnique(selector: string): boolean {
  try {
    return document.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

function findStableAttributeSelector(el: Element): string | null {
  const candidates = ["data-testid", "data-test", "data-cy", "data-qa"];
  for (const attr of candidates) {
    const value = el.getAttribute(attr);
    if (value) return `[${attr}="${cssEscape(value)}"]`;
  }
  return null;
}

function buildClassSelector(el: Element): string | null {
  const classes = Array.from(el.classList).filter((c) => !!c);
  if (classes.length === 0) return null;
  return `${el.tagName.toLowerCase()}.${classes.map(cssEscape).join(".")}`;
}

function buildNthPathSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body && current.parentElement) {
    const parent: Element = current.parentElement!;
    const currentTag = current.tagName;
    const siblings = Array.from(parent.children).filter((c) => c.tagName === currentTag);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${index})`);
    current = parent;
  }
  return `body > ${parts.join(" > ")}`;
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
