import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import puppyWalkUrl from "../assets/characters/puppy_walinkg.glb?url";

const MOVE_SPEED = 2.5;
const ROTATION_SPEED = 8;

const SIGNBOARD_POSITION = { x: 2, z: 5 };
const PROXIMITY_THRESHOLD = 1.8;

interface PlayerProps {
  onSignboardProximity?: (isNear: boolean) => void;
}

export function Player({ onSignboardProximity }: PlayerProps) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(puppyWalkUrl);
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
    const isMoving = forward || backward || left || right;

    if (isMoving) {
      const dir = new THREE.Vector3();
      if (forward) dir.z -= 1;
      if (backward) dir.z += 1;
      if (left) dir.x -= 1;
      if (right) dir.x += 1;
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

    // 표지판 proximity 감지
    if (onSignboardProximity) {
      const pos = group.current.position;
      const dx = pos.x - SIGNBOARD_POSITION.x;
      const dz = pos.z - SIGNBOARD_POSITION.z;
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

useGLTF.preload(puppyWalkUrl);
