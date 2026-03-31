import { useState, useCallback, type ReactNode } from "react";
import { joinPlayer, updatePlayerNickname, deletePlayer } from "../api/player";
import { GameContext } from "./game-context";
import type { PlayerData } from "../types/player";

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = useCallback(async (nickname: string, pin: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await joinPlayer(nickname, pin);
      setPlayer(response.player);
      setIsGameStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 에러가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateNickname = useCallback(async (nickname: string) => {
    if (!player) return;
    const updated = await updatePlayerNickname(player.id, nickname);
    setPlayer(updated);
  }, [player]);

  const deleteAccount = useCallback(async () => {
    if (!player) return;
    await deletePlayer(player.id);
    setPlayer(null);
    setIsGameStarted(false);
  }, [player]);

  const logout = useCallback(() => {
    setPlayer(null);
    setIsGameStarted(false);
    setError(null);
  }, []);

  return (
    <GameContext.Provider value={{ player, isGameStarted, isLoading, error, join, updateNickname, deleteAccount, logout }}>
      {children}
    </GameContext.Provider>
  );
}
