import type { PlayerDTO } from "../types/player";

export interface PlayerRow {
  id: string;
  nickname: string;
  joinedAt: Date | string;
  lastLoginAt: Date | string;
  lastPositionX: number;
  lastPositionY: number;
  lastPositionZ: number;
}

export function toPlayerDTO(row: PlayerRow): PlayerDTO {
  return {
    id: row.id,
    nickname: row.nickname,
    joinedAt:
      row.joinedAt instanceof Date ? row.joinedAt.toISOString() : row.joinedAt,
    lastPosition: {
      x: row.lastPositionX,
      y: row.lastPositionY,
      z: row.lastPositionZ,
    },
  };
}
