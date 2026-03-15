import { useEffect, useState } from "react";
import styled from "styled-components";
import { useGame } from "../contexts/GameContext";
import { getPlayers } from "../api/player";
import type { PlayerData } from "../types/player";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  color: white;
  font-family:
    "Pretendard",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  overflow-y: auto;
`;

const WelcomeCard = styled.div`
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 32px 40px;
  text-align: center;
  max-width: 500px;
  width: 100%;
  margin-bottom: 24px;
`;

const Nickname = styled.h1`
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 8px 0;
`;

const Info = styled.p`
  font-size: 14px;
  opacity: 0.8;
  margin: 4px 0;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px 0;
  text-align: left;
  width: 100%;
`;

const PlayerListCard = styled.div`
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
`;

const PlayerItem = styled.div<{ $isMe: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ $isMe }) =>
    $isMe ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.08)"};
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const PlayerName = styled.span`
  font-weight: 600;
  font-size: 15px;
`;

const PlayerDate = styled.span`
  font-size: 12px;
  opacity: 0.7;
`;

const Badge = styled.span`
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  margin-left: 8px;
`;

const EmptyText = styled.p`
  text-align: center;
  opacity: 0.6;
  font-size: 14px;
`;

const RefreshButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  margin-left: auto;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ListHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

export function GameScreen() {
  const { player } = useGame();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const fetchPlayers = async () => {
    setLoadingList(true);
    try {
      const data = await getPlayers();
      setPlayers(data);
    } catch (err) {
      console.error("플레이어 목록 조회 실패:", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  if (!player) return null;

  return (
    <Container>
      <WelcomeCard>
        <Nickname>{player.nickname}</Nickname>
        <Info>ID: {player.id}</Info>
        <Info>가입일: {new Date(player.joinedAt).toLocaleString("ko-KR")}</Info>
      </WelcomeCard>

      <PlayerListCard>
        <ListHeader>
          <SectionTitle>전체 플레이어 ({players.length}명)</SectionTitle>
          <RefreshButton onClick={fetchPlayers} disabled={loadingList}>
            {loadingList ? "로딩..." : "새로고침"}
          </RefreshButton>
        </ListHeader>

        {players.length === 0 && !loadingList && (
          <EmptyText>등록된 플레이어가 없습니다.</EmptyText>
        )}

        {players.map((p) => (
          <PlayerItem key={p.id} $isMe={p.id === player.id}>
            <div>
              <PlayerName>{p.nickname}</PlayerName>
              {p.id === player.id && <Badge>나</Badge>}
            </div>
            <PlayerDate>
              {new Date(p.joinedAt).toLocaleDateString("ko-KR")}
            </PlayerDate>
          </PlayerItem>
        ))}
      </PlayerListCard>
    </Container>
  );
}
