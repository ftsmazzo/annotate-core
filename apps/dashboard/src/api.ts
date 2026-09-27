export interface Annotation {
  id: string;
  status: string;
  severity: string | null;
  message: string;
  reporterName: string | null;
  url: string;
  selector: string;
  domPath: unknown;
  computedStyles: Record<string, string> | null;
  elementTextSnippet: string | null;
  resolvedSummary: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  authorName: string;
  authorKind: "human" | "agent";
  body: string;
  createdAt: string;
}

function getToken(): string {
  const params = new URLSearchParams(location.search);
  return params.get("t") ?? "";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${getToken()}`,
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

export function listAnnotations(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ annotations: Annotation[] }>(`/api/v1/annotations${qs}`);
}

export function getAnnotation(id: string) {
  return apiFetch<Annotation>(`/api/v1/annotations/${id}`);
}

export function updateAnnotationStatus(id: string, status: string) {
  return apiFetch<Annotation>(`/api/v1/annotations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function addComment(id: string, body: string, authorName: string) {
  return apiFetch<Comment>(`/api/v1/annotations/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, authorName, authorKind: "human" }),
  });
}
