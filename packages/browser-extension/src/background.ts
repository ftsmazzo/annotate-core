// Sem action.default_popup: clicar no ícone abre a página de opções como aba normal
// (persistente, não fecha ao trocar de aba — diferente do popup efêmero da v1).
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Content scripts não têm acesso a chrome.tabs.* (API privilegiada) — só o background.
// Screenshot real da aba visível, sem as limitações de aproximação de libs tipo html2canvas
// (fontes, cross-origin, etc.), porque é o próprio Chrome renderizando.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "annotate:capture-screenshot" || !sender.tab?.windowId) return;

  chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "jpeg", quality: 70 }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
      return;
    }
    sendResponse({ dataUrl });
  });

  return true; // mantém o canal aberto pra resposta assíncrona
});
