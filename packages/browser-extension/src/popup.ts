interface Config {
  endpoint: string;
  token: string;
}

const endpointInput = document.getElementById("endpoint") as HTMLInputElement;
const tokenInput = document.getElementById("token") as HTMLInputElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

chrome.storage.sync.get(["endpoint", "token"], (cfg: Partial<Config>) => {
  if (cfg.endpoint) endpointInput.value = cfg.endpoint;
  if (cfg.token) tokenInput.value = cfg.token;
  statusEl.textContent = cfg.endpoint && cfg.token ? "Ativo em todas as abas." : "Não configurado ainda.";
});

saveBtn.addEventListener("click", () => {
  const endpoint = endpointInput.value.trim().replace(/\/$/, "");
  const token = tokenInput.value.trim();
  chrome.storage.sync.set({ endpoint, token }, () => {
    statusEl.textContent = "Salvo — recarregue a página pra ver o lápis.";
  });
});
