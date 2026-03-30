import { useEffect, useState } from "react";
import styled from "styled-components";
import { useGame } from "../contexts/GameContext";
import { getPlayers } from "../api/player";
import type { PlayerData } from "../types/player";
import { GuestbookPanel } from "./GuestbookPanel";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  background: url("/animal_crossing_sky.png") no-repeat center center / cover;
  color: white;
  font-family:
    "Pretendard",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  overflow-y: auto;
`;

const WelcomeCard = styled.div`
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  border-radius: 24px;
  padding: 32px 40px;
  text-align: center;
  max-width: 500px;
  width: 100%;
  margin-bottom: 24px;
  color: #2d3436;
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
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  border-radius: 24px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  color: #2d3436;
  margin-bottom: 24px;
`;

const PlayerItem = styled.div<{ $isMe: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ $isMe }) =>
    $isMe ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.03)"};
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
  background: rgba(0, 0, 0, 0.08);
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
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.12);
  color: #2d3436;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  margin-left: auto;
  transition: background 0.2s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.1);
  }
`;

const ListHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: center;
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(0, 0, 0, 0.06);
  color: #2d3436;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.1);
  }
`;

const DangerButton = styled(ActionButton)`
  border-color: rgba(231, 76, 60, 0.4);

  &:hover {
    background: rgba(231, 76, 60, 0.3);
  }
`;

const EditInput = styled.input`
  padding: 8px 14px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  color: #2d3436;
  font-size: 16px;
  text-align: center;
  outline: none;

  &::placeholder {
    color: rgba(0, 0, 0, 0.35);
  }
`;

export function GameScreen() {
  const { player, updateNickname, deleteAccount, logout } = useGame();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

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

  const handleNicknameUpdate = async () => {
    if (!newNickname.trim()) return;
    setEditError(null);
    try {
      await updateNickname(newNickname.trim());
      setIsEditingNickname(false);
      setNewNickname("");
      fetchPlayers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "닉네임 변경 실패");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("정말 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.")) return;
    try {
      await deleteAccount();
    } catch (err) {
      console.error("회원탈퇴 실패:", err);
    }
  };

  return (
    <Container>
      <WelcomeCard>
        {isEditingNickname ? (
          <>
            <EditInput
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder="새 닉네임"
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleNicknameUpdate()}
            />
            <ButtonRow>
              <ActionButton onClick={handleNicknameUpdate}>저장</ActionButton>
              <ActionButton
                onClick={() => {
                  setIsEditingNickname(false);
                  setEditError(null);
                }}
              >
                취소
              </ActionButton>
            </ButtonRow>
            {editError && (
              <Info style={{ color: "#e74c3c", opacity: 1 }}>{editError}</Info>
            )}
          </>
        ) : (
          <>
            <Nickname>{player.nickname}</Nickname>
            {/* <Info>ID: {player.id}</Info> */}
            <Info>
              가입일: {new Date(player.joinedAt).toLocaleString("ko-KR")}
            </Info>
            <ButtonRow>
              <ActionButton
                onClick={() => {
                  setIsEditingNickname(true);
                  setNewNickname(player.nickname);
                }}
              >
                닉네임 변경
              </ActionButton>
              <ActionButton onClick={logout}>로그아웃</ActionButton>
              <DangerButton onClick={handleDeleteAccount}>
                회원탈퇴
              </DangerButton>
            </ButtonRow>
          </>
        )}
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

      <GuestbookPanel />
    </Container>
  );
}
