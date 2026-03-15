import { useState, type FormEvent } from "react";
import styled from "styled-components";
import { useGame } from "../contexts/GameContext";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #a8e6cf 0%, #88d8a8 50%, #69c98e 100%);
  font-family: "Pretendard", -apple-system, BlinkMacSystemFont, sans-serif;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  text-align: center;
  max-width: 400px;
  width: 90%;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 800;
  color: #2d5a3d;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #6b9b7a;
  margin: 0 0 32px 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Input = styled.input`
  padding: 14px 18px;
  border: 2px solid #d4e8db;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
  text-align: center;

  &:focus {
    border-color: #69c98e;
  }

  &::placeholder {
    color: #b0ccb8;
  }
`;

const Button = styled.button<{ $isLoading: boolean }>`
  padding: 14px;
  background: ${({ $isLoading }) => ($isLoading ? "#a0c4ab" : "#4caf7d")};
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: ${({ $isLoading }) => ($isLoading ? "not-allowed" : "pointer")};
  transition: background 0.2s, transform 0.1s;

  &:hover:not(:disabled) {
    background: #3d9b6a;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const ErrorMessage = styled.p`
  color: #e74c3c;
  font-size: 13px;
  margin: 0;
`;

export function NicknameScreen() {
  const { join, isLoading, error } = useGame();
  const [nickname, setNickname] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && !isLoading) {
      join(nickname.trim());
    }
  };

  return (
    <Container>
      <Card>
        <Title>Human Crossing</Title>
        <Subtitle>브라우저에서 만나는 3D 커뮤니티</Subtitle>
        <Form onSubmit={handleSubmit}>
          <Input
            type="text"
            placeholder="닉네임을 입력하세요"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            autoFocus
            disabled={isLoading}
          />
          <Button type="submit" $isLoading={isLoading} disabled={isLoading || !nickname.trim()}>
            {isLoading ? "접속 중..." : "시작하기"}
          </Button>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </Form>
      </Card>
    </Container>
  );
}
