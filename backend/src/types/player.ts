export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface PlayerDTO {
  id: string;
  nickname: string;
  joinedAt: string;
  lastPosition: Position;
}

export interface JoinResponseDTO {
  message: string;
  player: PlayerDTO;
  isNew: boolean;
}
