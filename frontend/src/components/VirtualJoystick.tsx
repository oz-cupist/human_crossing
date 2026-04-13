import { useRef, useCallback } from "react";
import styled from "styled-components";

const JOYSTICK_SIZE = 120;
const KNOB_SIZE = 48;
const MAX_DISTANCE = (JOYSTICK_SIZE - KNOB_SIZE) / 2;

const Container = styled.div`
  position: fixed;
  left: 32px;
  bottom: 100px;
  z-index: 30;
  width: ${JOYSTICK_SIZE}px;
  height: ${JOYSTICK_SIZE}px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  border: 2px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
  touch-action: none;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (min-width: 769px) {
    display: none;
  }
`;

const Knob = styled.div`
  width: ${KNOB_SIZE}px;
  height: ${KNOB_SIZE}px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  transition: background 0.1s;
`;

export interface JoystickInput {
  x: number; // -1 ~ 1 (좌우)
  z: number; // -1 ~ 1 (전후)
}

interface VirtualJoystickProps {
  onMove: (input: JoystickInput) => void;
}

export function VirtualJoystick({ onMove }: VirtualJoystickProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTouchRef = useRef<number | null>(null);

  const getCenter = useCallback(() => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      const center = getCenter();
      let dx = clientX - center.x;
      let dy = clientY - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > MAX_DISTANCE) {
        dx = (dx / dist) * MAX_DISTANCE;
        dy = (dy / dist) * MAX_DISTANCE;
      }

      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }

      const normalizedX = dx / MAX_DISTANCE;
      const normalizedZ = dy / MAX_DISTANCE;

      // deadzone: 아주 미세한 터치는 무시
      if (Math.abs(normalizedX) < 0.15 && Math.abs(normalizedZ) < 0.15) {
        onMove({ x: 0, z: 0 });
      } else {
        onMove({ x: normalizedX, z: normalizedZ });
      }
    },
    [getCenter, onMove],
  );

  const handleEnd = useCallback(() => {
    activeTouchRef.current = null;
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(0px, 0px)";
    }
    onMove({ x: 0, z: 0 });
  }, [onMove]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      activeTouchRef.current = touch.identifier;
      handleMove(touch.clientX, touch.clientY);
    },
    [handleMove],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchRef.current) {
          handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    },
    [handleMove],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchRef.current) {
          handleEnd();
          break;
        }
      }
    },
    [handleEnd],
  );

  return (
    <Container
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <Knob ref={knobRef} />
    </Container>
  );
}
