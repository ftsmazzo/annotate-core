// Sem action.default_popup: clicar no ícone abre a página de opções como aba normal
// (persistente, não fecha ao trocar de aba — diferente do popup efêmero da v1).
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
