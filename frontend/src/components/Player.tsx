import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import type { JoystickInput } from "./VirtualJoystick";

import puppyUrl from "../assets/characters/puppy_walinkg.glb?url";
import fawnUrl from "../assets/characters/fawn_walking.glb?url";
import omoknuneUrl from "../assets/characters/omoknune_walking.glb?url";
import penguinUrl from "../assets/characters/penguin_walk.glb?url";
import redPandaUrl from "../assets/characters/red_panda_walking.glb?url";
import tigerUrl from "../assets/characters/tiger_walking.glb?url";
import hamsterUrl from "../assets/characters/hamster_walking.glb?url";

export const CHARACTER_MODELS = [puppyUrl, fawnUrl, omoknuneUrl, penguinUrl, redPandaUrl, tigerUrl, hamsterUrl];

const MOVE_SPEED = 2.5;
const ROTATION_SPEED = 8;

const COUPLE_POSITION = { x: 0, z: -3.2 };
const PROXIMITY_THRESHOLD = 2.5;
const SEND_INTERVAL = 1 / 15; // 초당 15회 전송

interface PlayerProps {
  onSignboardProximity?: (isNear: boolean) => void;
  joystickInput?: React.RefObject<JoystickInput>;
  positionRef?: React.RefObject<THREE.Vector3>;
  characterIndex?: number;
  onPositionUpdate?: (x: number, y: number, z: number, rotationY: number, action: string) => void;
}

export function Player({ onSignboardProximity, joystickInput, positionRef, characterIndex, onPositionUpdate }: PlayerProps) {
  const group = useRef<THREE.Group>(null!);
  const sendTimer = useRef(0);
  const modelUrl = useMemo(
    () => CHARACTER_MODELS[characterIndex ?? Math.floor(Math.random() * CHARACTER_MODELS.length)],
    [characterIndex],
  );
  const { scene, animations } = useGLTF(modelUrl);
  const { actions, names } = useAnimations(animations, group);
  const keysRef = useRef({ forward: false, backward: false, left: false, right: false });
  const wasNearRef = useRef(false);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW": case "ArrowUp": keysRef.current.forward = true; break;
        case "KeyS": case "ArrowDown": keysRef.current.backward = true; break;
        case "KeyA": case "ArrowLeft": keysRef.current.left = true; break;
        case "KeyD": case "ArrowRight": keysRef.current.right = true; break;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW": case "ArrowUp": keysRef.current.forward = false; break;
        case "KeyS": case "ArrowDown": keysRef.current.backward = false; break;
        case "KeyA": case "ArrowLeft": keysRef.current.left = false; break;
        case "KeyD": case "ArrowRight": keysRef.current.right = false; break;
      }
    };
    document.addEventListener("keydown", onDown);
    document.addEventListener("keyup", onUp);
    return () => {
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("keyup", onUp);
    };
  }, []);

  useEffect(() => {
    if (names.length > 0 && actions[names[0]]) {
      actions[names[0]]!.reset().fadeIn(0.2).play();
    }
    return () => { names.forEach((n) => actions[n]?.stop()); };
  }, [actions, names]);

  useFrame((_, delta) => {
    if (!group.current) return;

    const { forward, backward, left, right } = keysRef.current;
    const joy = joystickInput?.current;
    const hasKeyboard = forward || backward || left || right;
    const hasJoystick = joy && (Math.abs(joy.x) > 0 || Math.abs(joy.z) > 0);
    const isMoving = hasKeyboard || hasJoystick;

    if (isMoving) {
      const dir = new THREE.Vector3();

      if (hasJoystick) {
        dir.x = joy.x;
        dir.z = joy.z;
      } else {
        if (forward) dir.z -= 1;
        if (backward) dir.z += 1;
        if (left) dir.x -= 1;
        if (right) dir.x += 1;
      }
      dir.normalize();

      group.current.rotation.y = Math.atan2(dir.x, dir.z);
      group.current.position.x += dir.x * MOVE_SPEED * delta;
      group.current.position.z += dir.z * MOVE_SPEED * delta;

      if (names.length > 0) {
        actions[names[0]]!.paused = false;
        actions[names[0]]!.setEffectiveTimeScale(1);
      }
    } else {
      if (names.length > 0) {
        actions[names[0]]!.setEffectiveTimeScale(0);
      }
    }

    // 위치 공유
    if (positionRef) {
      (positionRef as React.MutableRefObject<THREE.Vector3>).current.copy(group.current.position);
    }

    // 서버에 위치 전송 (throttle)
    if (onPositionUpdate) {
      sendTimer.current += delta;
      if (sendTimer.current >= SEND_INTERVAL) {
        sendTimer.current = 0;
        const pos = group.current.position;
        onPositionUpdate(pos.x, pos.y, pos.z, group.current.rotation.y, isMoving ? "walk" : "idle");
      }
    }

    // 신랑신부 proximity 감지
    if (onSignboardProximity) {
      const pos = group.current.position;
      const dx = pos.x - COUPLE_POSITION.x;
      const dz = pos.z - COUPLE_POSITION.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const isNear = dist < PROXIMITY_THRESHOLD;

      if (isNear !== wasNearRef.current) {
        wasNearRef.current = isNear;
        onSignboardProximity(isNear);
      }
    }
  });

  return (
    <group ref={group} position={[0, 0.3, 0]} scale={0.65}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

CHARACTER_MODELS.forEach((url) => useGLTF.preload(url));
