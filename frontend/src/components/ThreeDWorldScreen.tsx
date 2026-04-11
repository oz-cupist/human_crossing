import { Suspense, useEffect, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF, useProgress, Sky } from "@react-three/drei";
import * as THREE from "three";
import styled from "styled-components";
import worldModelUrl from "../assets/animal_crossing_world.glb?url";
import { Player } from "./Player";

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
          <Player />
        </Suspense>
        <OrbitControls
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
        </Description>
      </OverlayCard>
    </Screen>
  );
}

useGLTF.preload(WORLD_MODEL_PATH);
