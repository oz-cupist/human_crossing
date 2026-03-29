import type { GuestbookEntry } from "../types/guestbook";

const API_BASE = import.meta.env.VITE_API_URL || "";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "서버 에러가 발생했습니다.");
  }
  return response.json();
}

export async function getGuestbook(): Promise<GuestbookEntry[]> {
  const response = await fetch(`${API_BASE}/api/guestbook`);
  return handleResponse<GuestbookEntry[]>(response);
}

export async function createGuestbook(authorId: string, content: string): Promise<GuestbookEntry> {
  const response = await fetch(`${API_BASE}/api/guestbook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authorId, content }),
  });
  return handleResponse<GuestbookEntry>(response);
}

export async function updateGuestbook(id: string, authorId: string, content: string): Promise<GuestbookEntry> {
  const response = await fetch(`${API_BASE}/api/guestbook/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authorId, content }),
  });
  return handleResponse<GuestbookEntry>(response);
}

export async function deleteGuestbook(id: string, authorId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/api/guestbook/${id}?authorId=${authorId}`, {
    method: "DELETE",
  });
  return handleResponse<{ message: string }>(response);
}
