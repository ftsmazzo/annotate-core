import { getAdminToken } from "./adminApi.js";
import type { Annotation, Comment } from "./api.js";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      "x-admin-token": getAdminToken(),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

export function listAnnotationsAsAdmin(slug: string, status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return adminFetch<{ annotations: Annotation[] }>(`/api/v1/admin/projects/${slug}/annotations${qs}`);
}

export function getAnnotationAsAdmin(slug: string, id: string) {
  return adminFetch<Annotation & { comments: Comment[] }>(
    `/api/v1/admin/projects/${slug}/annotations/${id}`,
  );
}

export function updateAnnotationStatusAsAdmin(slug: string, id: string, status: string) {
  return adminFetch<Annotation>(`/api/v1/admin/projects/${slug}/annotations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function addCommentAsAdmin(slug: string, id: string, body: string, authorName: string) {
  return adminFetch<Comment>(`/api/v1/admin/projects/${slug}/annotations/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, authorName }),
  });
}
