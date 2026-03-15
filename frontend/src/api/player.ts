import type { PlayerData, JoinResponse } from "../types/player";

const API_BASE = import.meta.env.VITE_API_URL || "";

export async function joinPlayer(nickname: string): Promise<JoinResponse> {
  const response = await fetch(`${API_BASE}/api/players/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "서버 에러가 발생했습니다.");
  }

  return response.json();
}

export async function getPlayers(): Promise<PlayerData[]> {
  const response = await fetch(`${API_BASE}/api/players`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "서버 에러가 발생했습니다.");
  }

  return response.json();
}

export async function getPlayerById(id: string): Promise<PlayerData> {
  const response = await fetch(`${API_BASE}/api/players/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "서버 에러가 발생했습니다.");
  }

  return response.json();
}
