import { useState } from "react";
import styled from "styled-components";
import { GameScreen } from "./GameScreen";
import { ThreeDWorldScreen } from "./ThreeDWorldScreen";

type ActiveScreen = "lobby" | "world";

const Shell = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const Switcher = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 20;
  display: inline-flex;
  gap: 8px;
  padding: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px);
  box-shadow: 0 16px 40px rgba(39, 63, 54, 0.16);

  @media (max-width: 640px) {
    top: 14px;
    right: 14px;
    left: 14px;
    justify-content: center;
  }
`;

const SwitchButton = styled.button<{ $active: boolean }>`
  border: none;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  color: ${({ $active }) => ($active ? "#ffffff" : "#35624f")};
  background: ${({ $active }) =>
    $active ? "linear-gradient(135deg, #56b174, #2f8f66)" : "transparent"};
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

export function PostLoginShell() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("lobby");

  return (
    <Shell>
      <Switcher>
        <SwitchButton
          type="button"
          $active={activeScreen === "lobby"}
          onClick={() => setActiveScreen("lobby")}
        >
          기존 화면
        </SwitchButton>
        <SwitchButton
          type="button"
          $active={activeScreen === "world"}
          onClick={() => setActiveScreen("world")}
        >
          3D 월드
        </SwitchButton>
      </Switcher>

      {activeScreen === "lobby" ? <GameScreen /> : <ThreeDWorldScreen />}
    </Shell>
  );
}
