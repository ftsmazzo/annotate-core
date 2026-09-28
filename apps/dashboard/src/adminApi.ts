export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface CreatedProject {
  project: { id: string; name: string; slug: string };
  widgetToken: string;
  accessToken: string;
}

const ADMIN_TOKEN_KEY = "annotate_admin_token";

export function getAdminToken(): string {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAdminToken(token: string) {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // localStorage indisponível (aba privada, etc.) — token só dura a sessão em memória.
  }
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      // Só manda content-type: application/json quando REALMENTE tem corpo — senão o
      // Fastify tenta interpretar um corpo vazio como JSON e responde 400 (foi exatamente
      // o bug do botão "Excluir"/"Gerar novo link", que não mandam body nenhum).
      ...(init?.body ? { "content-type": "application/json" } : {}),
      "x-admin-token": getAdminToken(),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

export function listProjects() {
  return adminFetch<{ projects: ProjectSummary[] }>("/api/v1/admin/projects");
}

export function createProject(name: string) {
  return adminFetch<CreatedProject>("/api/v1/admin/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deleteProject(slug: string) {
  return adminFetch<{ deleted: boolean }>(`/api/v1/admin/projects/${slug}`, { method: "DELETE" });
}

export function regenerateTokens(slug: string) {
  return adminFetch<CreatedProject>(`/api/v1/admin/projects/${slug}/regenerate-tokens`, { method: "POST" });
}
