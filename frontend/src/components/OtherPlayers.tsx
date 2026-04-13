import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import * as THREE from "three";
import { CHARACTER_MODELS } from "./Player";
import type { RemotePlayer } from "../hooks/useMultiplayer";

const LERP_SPEED = 0.15;

function RemoteCharacter({ player }: { player: RemotePlayer }) {
  const group = useRef<THREE.Group>(null!);
  const modelUrl = CHARACTER_MODELS[player.character % CHARACTER_MODELS.length];
  const { scene, animations } = useGLTF(modelUrl);
  const clonedScene = scene.clone(true);
  const { actions, names } = useAnimations(animations, group);

  useFrame(() => {
    if (!group.current) return;

    // 부드럽게 위치/회전 보간
    group.current.position.lerp(
      new THREE.Vector3(player.x, player.y, player.z),
      LERP_SPEED,
    );
    // 회전 보간
    const targetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, player.rotationY, 0),
    );
    group.current.quaternion.slerp(targetQuat, LERP_SPEED);

    // 애니메이션
    if (names.length > 0 && actions[names[0]]) {
      if (player.action === "walk") {
        actions[names[0]]!.paused = false;
        actions[names[0]]!.setEffectiveTimeScale(1);
      } else {
        actions[names[0]]!.setEffectiveTimeScale(0);
      }
    }
  });

  // 첫 애니메이션 재생
  useFrame(() => {}, -1); // noop to ensure order
  if (names.length > 0 && actions[names[0]] && !actions[names[0]]!.isRunning()) {
    actions[names[0]]!.reset().fadeIn(0.2).play();
  }

  return (
    <group
      ref={group}
      position={[player.x, player.y, player.z]}
      scale={0.65}
    >
      <primitive object={clonedScene} dispose={null} />
      <Html
        position={[0, 2.8, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.55)",
            color: "white",
            padding: "2px 8px",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: 700,
            whiteSpace: "nowrap",
            fontFamily: "Cafe24Ssurround, sans-serif",
          }}
        >
          {player.nickname}
        </div>
      </Html>
    </group>
  );
}

interface OtherPlayersProps {
  players: Map<string, RemotePlayer>;
}

export function OtherPlayers({ players }: OtherPlayersProps) {
  return (
    <>
      {Array.from(players.entries()).map(([key, player]) => (
        <RemoteCharacter key={key} player={player} />
      ))}
    </>
  );
}
