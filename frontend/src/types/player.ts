export interface PlayerData {
  id: string;
  nickname: string;
  joinedAt: string;
  lastPosition: {
    x: number;
    y: number;
    z: number;
  };
}

export interface JoinResponse {
  message: string;
  player: PlayerData;
  isNew: boolean;
}
