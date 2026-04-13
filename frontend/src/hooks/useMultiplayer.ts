import { useEffect, useRef, useState, useCallback } from "react";
import { Client, Room } from "colyseus.js";

export interface RemotePlayer {
  id: string;
  nickname: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  character: number;
  action: string;
}

const WS_PORT = 4001;
const WS_URL = `ws://${window.location.hostname}:${WS_PORT}`;

export function useMultiplayer(nickname: string | undefined, characterIndex: number) {
  const roomRef = useRef<Room | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayer>>(new Map());
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!nickname) return;

    const client = new Client(WS_URL);
    let room: Room;

    const connect = async () => {
      try {
        room = await client.joinOrCreate("game", { nickname, character: characterIndex });
        roomRef.current = room;
        setSessionId(room.sessionId);
        setConnected(true);
        console.log(`🎮 멀티플레이 접속 (${room.sessionId})`);

        // 다른 플레이어 상태 동기화
        room.state.players.onAdd((player: any, key: string) => {
          if (key === room.sessionId) return; // 나 자신은 제외

          setRemotePlayers((prev) => {
            const next = new Map(prev);
            next.set(key, {
              id: player.id,
              nickname: player.nickname,
              x: player.x,
              y: player.y,
              z: player.z,
              rotationY: player.rotationY,
              character: player.character,
              action: player.action,
            });
            return next;
          });

          player.onChange(() => {
            setRemotePlayers((prev) => {
              const next = new Map(prev);
              next.set(key, {
                id: player.id,
                nickname: player.nickname,
                x: player.x,
                y: player.y,
                z: player.z,
                rotationY: player.rotationY,
                character: player.character,
                action: player.action,
              });
              return next;
            });
          });
        });

        room.state.players.onRemove((_player: any, key: string) => {
          setRemotePlayers((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        });
      } catch (err) {
        console.error("멀티플레이 접속 실패:", err);
      }
    };

    connect();

    return () => {
      room?.leave();
      roomRef.current = null;
      setConnected(false);
      setSessionId(null);
      setRemotePlayers(new Map());
    };
  }, [nickname, characterIndex]);

  const sendPosition = useCallback(
    (x: number, y: number, z: number, rotationY: number, action: string) => {
      roomRef.current?.send("move", { x, y, z, rotationY, action });
    },
    [],
  );

  return { remotePlayers, connected, sessionId, sendPosition };
}
