import { useEffect, useState, type FormEvent } from "react";
import styled from "styled-components";
import { useGame } from "../contexts/GameContext";
import type { GuestbookEntry } from "../types/guestbook";
import {
  getGuestbook,
  createGuestbook,
  updateGuestbook,
  deleteGuestbook,
} from "../api/guestbook";

const Card = styled.div`
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  flex: 1;
`;

const WriteForm = styled.form`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const TextInput = styled.input`
  flex: 1;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const SmallButton = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
`;

const SubmitButton = styled(SmallButton)`
  background: rgba(255, 255, 255, 0.25);
  color: white;

  &:hover {
    background: rgba(255, 255, 255, 0.35);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EntryItem = styled.div`
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const EntryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const AuthorName = styled.span`
  font-weight: 600;
  font-size: 14px;
`;

const EntryDate = styled.span`
  font-size: 11px;
  opacity: 0.6;
`;

const EntryContent = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
`;

const ActionButton = styled(SmallButton)`
  padding: 4px 10px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.15);
  color: white;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

const DeleteButton = styled(ActionButton)`
  &:hover {
    background: rgba(231, 76, 60, 0.5);
  }
`;

const EmptyText = styled.p`
  text-align: center;
  opacity: 0.6;
  font-size: 14px;
`;

export function GuestbookPanel() {
  const { player } = useGame();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchEntries = async () => {
    try {
      const data = await getGuestbook();
      setEntries(data);
    } catch (err) {
      console.error("방명록 조회 실패:", err);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  if (!player) return null;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;
    setLoading(true);
    try {
      await createGuestbook(player.id, content.trim());
      setContent("");
      await fetchEntries();
    } catch (err) {
      console.error("방명록 작성 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim() || loading) return;
    setLoading(true);
    try {
      await updateGuestbook(id, player.id, editContent.trim());
      setEditingId(null);
      setEditContent("");
      await fetchEntries();
    } catch (err) {
      console.error("방명록 수정 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteGuestbook(id, player.id);
      await fetchEntries();
    } catch (err) {
      console.error("방명록 삭제 실패:", err);
    }
  };

  return (
    <Card>
      <Header>
        <Title>방명록 ({entries.length}개)</Title>
      </Header>

      <WriteForm onSubmit={handleCreate}>
        <TextInput
          placeholder="메시지를 남겨보세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          disabled={loading}
        />
        <SubmitButton type="submit" disabled={!content.trim() || loading}>
          작성
        </SubmitButton>
      </WriteForm>

      {entries.length === 0 && <EmptyText>아직 방명록이 없습니다.</EmptyText>}

      {entries.map((entry) => (
        <EntryItem key={entry.id}>
          <EntryHeader>
            <AuthorName>{entry.authorNickname}</AuthorName>
            <EntryDate>
              {new Date(entry.createdAt).toLocaleString("ko-KR")}
            </EntryDate>
          </EntryHeader>

          {editingId === entry.id ? (
            <WriteForm
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdate(entry.id);
              }}
            >
              <TextInput
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={500}
                autoFocus
              />
              <SubmitButton type="submit" disabled={!editContent.trim()}>
                저장
              </SubmitButton>
              <ActionButton type="button" onClick={() => setEditingId(null)}>
                취소
              </ActionButton>
            </WriteForm>
          ) : (
            <>
              <EntryContent>{entry.content}</EntryContent>
              {entry.authorId === player.id && (
                <Actions>
                  <ActionButton
                    onClick={() => {
                      setEditingId(entry.id);
                      setEditContent(entry.content);
                    }}
                  >
                    수정
                  </ActionButton>
                  <DeleteButton onClick={() => handleDelete(entry.id)}>
                    삭제
                  </DeleteButton>
                </Actions>
              )}
            </>
          )}
        </EntryItem>
      ))}
    </Card>
  );
}
