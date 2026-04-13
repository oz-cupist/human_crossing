import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF, useProgress, Sky } from "@react-three/drei";
import * as THREE from "three";
import styled from "styled-components";
import worldModelUrl from "../assets/animal_crossing_world.glb?url";
import { Player, CHARACTER_MODELS } from "./Player";
import { WeddingCouple } from "./WeddingCouple";
import { GuestbookModal } from "./GuestbookModal";
import { VirtualJoystick, type JoystickInput } from "./VirtualJoystick";
import { OtherPlayers } from "./OtherPlayers";
import { useMultiplayer } from "../hooks/useMultiplayer";
import { useGame } from "../contexts/useGame";

const WORLD_MODEL_PATH = worldModelUrl;

const Screen = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.22), transparent 40%),
    linear-gradient(180deg, #93dbff 0%, #c9f2f7 38%, #b8e9c3 100%);
`;

const OverlayCard = styled.div`
  position: absolute;
  left: 24px;
  bottom: 24px;
  z-index: 10;
  max-width: 340px;
  padding: 18px 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 48px rgba(35, 85, 64, 0.16);
  color: #22483c;

  @media (max-width: 640px) {
    right: 16px;
    left: 16px;
    bottom: 16px;
    max-width: none;
  }
`;

const Title = styled.h2`
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 800;
`;

const Description = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(34, 72, 60, 0.84);
`;

const Hint = styled.p`
  margin: 10px 0 0;
  font-size: 12px;
  color: rgba(34, 72, 60, 0.7);
`;

const LoaderText = styled.div`
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #2d5a3d;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 12px 36px rgba(35, 85, 64, 0.16);
`;

function LoadingState() {
  const { progress } = useProgress();

  return (
    <Html center>
      <LoaderText>월드를 불러오는 중... {Math.round(progress)}%</LoaderText>
    </Html>
  );
}

const CAMERA_LERP = 0.05;

function CameraFollow({
  targetRef,
  controlsRef,
}: {
  targetRef: React.RefObject<THREE.Vector3>;
  controlsRef: React.RefObject<any>;
}) {
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const target = targetRef.current;
    controls.target.lerp(
      new THREE.Vector3(target.x, target.y + 1, target.z),
      CAMERA_LERP,
    );
  });

  return null;
}

function WorldModel() {
  const { scene } = useGLTF(WORLD_MODEL_PATH);

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} />;
}

export function ThreeDWorldScreen() {
  const { player } = useGame();
  const [showGuestbook, setShowGuestbook] = useState(false);
  const [isNearSignboard, setIsNearSignboard] = useState(false);
  const joystickRef = useRef<JoystickInput>({ x: 0, z: 0 });
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.3, 0));
  const orbitRef = useRef<any>(null!);

  const characterIndex = useMemo(
    () => Math.floor(Math.random() * CHARACTER_MODELS.length),
    [],
  );

  const { remotePlayers, connected, sendPosition } = useMultiplayer(
    player?.nickname,
    characterIndex,
  );

  const handleSignboardProximity = useCallback((isNear: boolean) => {
    setIsNearSignboard(isNear);
    if (isNear) {
      setShowGuestbook(true);
    }
  }, []);

  const handleJoystickMove = useCallback((input: JoystickInput) => {
    joystickRef.current = input;
  }, []);

  return (
    <Screen>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [5, 6, 10], fov: 50, near: 0.1, far: 500 }}
      >
        <Sky
          distance={450000}
          sunPosition={[100, 60, 100]}
          inclination={0.52}
          azimuth={0.25}
          rayleigh={0.5}
          turbidity={8}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
        <fog attach="fog" args={["#c8e6f8", 30, 90]} />
        <ambientLight intensity={1.2} color="#f0f5ff" />
        <hemisphereLight
          intensity={0.9}
          color="#87ceeb"
          groundColor="#7ab856"
        />
        <directionalLight
          position={[18, 22, 12]}
          intensity={1.8}
          color="#fff5e6"
        />
        <Suspense fallback={<LoadingState />}>
          <WorldModel />
          <WeddingCouple />
          <Player
            onSignboardProximity={handleSignboardProximity}
            joystickInput={joystickRef}
            positionRef={playerPosRef}
            characterIndex={characterIndex}
            onPositionUpdate={sendPosition}
          />
          <OtherPlayers players={remotePlayers} />
        </Suspense>
        <CameraFollow targetRef={playerPosRef} controlsRef={orbitRef} />
        <OrbitControls
          ref={orbitRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.2}
          enablePan={false}
          enableKeys={false}
          target={[0, 1, 0]}
        />
      </Canvas>

      <OverlayCard>
        <Title>Human Crossing</Title>
        <Description>
          WASD 또는 방향키로 캐릭터를 움직여보세요.
          {connected && (
            <><br />접속 중: {remotePlayers.size + 1}명</>
          )}
        </Description>
        {isNearSignboard && !showGuestbook && (
          <Hint>표지판 근처입니다! 클릭하여 방명록 열기</Hint>
        )}
      </OverlayCard>

      <VirtualJoystick onMove={handleJoystickMove} />

      {showGuestbook && (
        <GuestbookModal onClose={() => setShowGuestbook(false)} />
      )}
    </Screen>
  );
}

useGLTF.preload(WORLD_MODEL_PATH);
