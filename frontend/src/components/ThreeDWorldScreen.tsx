import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Html, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import styled from "styled-components";
import worldModelUrl from "../assets/animal_crossing_world.glb?url";

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
  return (
    <Screen>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [12, 10, 12], fov: 42, near: 0.1, far: 500 }}
      >
        <color attach="background" args={["#b7e6ff"]} />
        <fog attach="fog" args={["#b7e6ff", 50, 150]} />
        <ambientLight intensity={1.3} />
        <hemisphereLight
          intensity={1}
          color="#f5f9ff"
          groundColor="#86ba6d"
        />
        <directionalLight
          castShadow
          position={[18, 22, 12]}
          intensity={1.5}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <Suspense fallback={<LoadingState />}>
          <Bounds fit clip observe margin={1.12}>
            <WorldModel />
          </Bounds>
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={70}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 2, 0]}
        />
      </Canvas>

      <OverlayCard>
        <Title>Animal Crossing World</Title>
        <Description>
          저장소에 추가된 `animal_crossing_world.glb`를 그대로 로드한 3D 화면입니다.
          마우스나 터치로 회전하고, 휠이나 핀치로 확대할 수 있습니다.
        </Description>
        <Hint>상단 스위처로 언제든 기존 로그인 이후 화면으로 돌아갈 수 있습니다.</Hint>
      </OverlayCard>
    </Screen>
  );
}

useGLTF.preload(WORLD_MODEL_PATH);
