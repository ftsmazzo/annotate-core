interface SiteMapping {
  hostname: string;
  endpoint: string;
  token: string;
}

const listEl = document.getElementById("list") as HTMLUListElement;
const hostnameInput = document.getElementById("hostname") as HTMLInputElement;
const endpointInput = document.getElementById("endpoint") as HTMLInputElement;
const tokenInput = document.getElementById("token") as HTMLInputElement;
const addBtn = document.getElementById("add") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

function normalizeHostname(value: string): string {
  return value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function render(mappings: SiteMapping[]) {
  listEl.innerHTML = "";
  if (mappings.length === 0) {
    listEl.innerHTML = '<li style="color:#6b7280">Nenhum site configurado ainda.</li>';
    return;
  }
  for (const m of mappings) {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="row">
        <strong>${m.hostname}</strong>
        <button class="remove" data-hostname="${m.hostname}">Remover</button>
      </div>
    `;
    listEl.appendChild(li);
  }
  listEl.querySelectorAll<HTMLButtonElement>(".remove").forEach((btn) => {
    btn.addEventListener("click", () => removeMapping(btn.dataset.hostname!));
  });
}

function load() {
  chrome.storage.sync.get(["mappings"], (data: { mappings?: SiteMapping[] }) => {
    render(data.mappings ?? []);
  });
}

function removeMapping(hostname: string) {
  chrome.storage.sync.get(["mappings"], (data: { mappings?: SiteMapping[] }) => {
    const next = (data.mappings ?? []).filter((m) => m.hostname !== hostname);
    chrome.storage.sync.set({ mappings: next }, load);
  });
}

addBtn.addEventListener("click", () => {
  const hostname = normalizeHostname(hostnameInput.value);
  const endpoint = endpointInput.value.trim().replace(/\/$/, "");
  const token = tokenInput.value.trim();
  if (!hostname || !endpoint || !token) {
    statusEl.textContent = "Preencha os três campos.";
    statusEl.style.color = "#dc2626";
    return;
  }
  chrome.storage.sync.get(["mappings"], (data: { mappings?: SiteMapping[] }) => {
    const next = [...(data.mappings ?? []).filter((m) => m.hostname !== hostname), { hostname, endpoint, token }];
    chrome.storage.sync.set({ mappings: next }, () => {
      hostnameInput.value = "";
      tokenInput.value = "";
      statusEl.textContent = "Salvo — recarregue a página desse site.";
      statusEl.style.color = "#16a34a";
      load();
    });
  });
});

load();
