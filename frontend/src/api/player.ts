import type { PlayerData, JoinResponse } from "../types/player";

const API_BASE = import.meta.env.VITE_API_URL || "";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "서버 에러가 발생했습니다.");
  }
  return response.json();
}

export async function joinPlayer(nickname: string, pin: string): Promise<JoinResponse> {
  const response = await fetch(`${API_BASE}/api/players/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, pin }),
  });
  return handleResponse<JoinResponse>(response);
}

export async function getPlayers(): Promise<PlayerData[]> {
  const response = await fetch(`${API_BASE}/api/players`);
  return handleResponse<PlayerData[]>(response);
}

export async function getPlayerById(id: string): Promise<PlayerData> {
  const response = await fetch(`${API_BASE}/api/players/${id}`);
  return handleResponse<PlayerData>(response);
}

export async function updatePlayerNickname(id: string, nickname: string): Promise<PlayerData> {
  const response = await fetch(`${API_BASE}/api/players/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
  return handleResponse<PlayerData>(response);
}

export async function deletePlayer(id: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/api/players/${id}`, {
    method: "DELETE",
  });
  return handleResponse<{ message: string }>(response);
}
