import { useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { GuestbookPanel } from "./GuestbookPanel";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  animation: ${fadeIn} 0.25s ease;
`;

const ModalContainer = styled.div`
  position: relative;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  animation: ${slideUp} 0.3s ease;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  color: #2d3436;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.16);
  }
`;

const Hint = styled.p`
  text-align: center;
  margin: 12px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
`;

interface GuestbookModalProps {
  onClose: () => void;
}

export function GuestbookModal({ onClose }: GuestbookModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <Backdrop onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContainer>
        <CloseButton onClick={onClose}>×</CloseButton>
        <GuestbookPanel />
        <Hint>ESC 또는 바깥 클릭으로 닫기</Hint>
      </ModalContainer>
    </Backdrop>
  );
}
