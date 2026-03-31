import { createContext } from "react";
import type { PlayerData } from "../types/player";

export interface GameContextValue {
  player: PlayerData | null;
  isGameStarted: boolean;
  isLoading: boolean;
  error: string | null;
  join: (nickname: string, pin: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => void;
}

export const GameContext = createContext<GameContextValue | null>(null);
