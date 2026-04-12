import { useRef, useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import brideDanceUrl from "../assets/characters/bride_dance.glb?url";
import groomDanceUrl from "../assets/characters/groom_dance.glb?url";

function Npc({
  url,
  position,
  rotation,
  scale = 0.8,
}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
}) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(url);
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    if (names.length > 0 && actions[names[0]]) {
      actions[names[0]]!.reset().fadeIn(0.2).play();
    }
    return () => {
      names.forEach((n) => actions[n]?.stop());
    };
  }, [actions, names]);

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

export function WeddingCouple() {
  return (
    <>
      <Npc
        url={brideDanceUrl}
        position={[-0.5, 0.4, -3.2]}
        rotation={[0, 0, 0]}
        scale={0.8}
      />
      <Npc
        url={groomDanceUrl}
        position={[0.5, 0.4, -3.2]}
        rotation={[0, 0, 0]}
        scale={0.8}
      />
    </>
  );
}

useGLTF.preload(brideDanceUrl);
useGLTF.preload(groomDanceUrl);
