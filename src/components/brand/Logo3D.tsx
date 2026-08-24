import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import * as THREE from "three";
import logoAsset from "@/assets/tatuverso3d-logo-3d.png.asset.json";

type MedallionProps = {
  /** rotação alvo (rad/s). 0 = parada (prefers-reduced-motion) */
  speed: number;
  hoverRef: React.RefObject<boolean>;
  dragRef: React.RefObject<{ dragging: boolean; delta: number }>;
  reducedMotion: boolean;
};

function Medallion({ speed, hoverRef, dragRef, reducedMotion }: MedallionProps) {
  const group = useRef<THREE.Group>(null);
  const texture = useTexture(logoAsset.url);




  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(delta, 0.05);

    if (dragRef.current?.delta) {
      g.rotation.y += dragRef.current.delta;
      dragRef.current.delta = 0;
    }

    if (!reducedMotion && !dragRef.current?.dragging) {
      const factor = hoverRef.current ? 0.35 : 1;
      g.rotation.y += speed * factor * d;
    }

    if (!reducedMotion) {
      g.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.045;
    }
  });

  return (
    <group ref={group}>
      {/* corpo com espessura */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1, 1, 0.17, 128]} />
        <meshStandardMaterial color="#061657" roughness={0.38} metalness={0.35} />
      </mesh>

      {/* chanfro / contorno externo */}
      <mesh>
        <torusGeometry args={[0.995, 0.05, 24, 128]} />
        <meshStandardMaterial
          color="#08CFFF"
          roughness={0.25}
          metalness={0.5}
          emissive="#08CFFF"
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* face frontal */}
      <mesh position={[0, 0, 0.0865]}>
        <planeGeometry args={[1.36, 1.36]} />
        <meshStandardMaterial
          map={texture}
          transparent
          roughness={0.45}
          metalness={0.05}
          toneMapped={false}
        />
      </mesh>

      {/* face traseira (não espelhada) */}
      <mesh position={[0, 0, -0.0865]} rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]}>
        <planeGeometry args={[1.36, 1.36]} />
        <meshStandardMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          roughness={0.45}
          metalness={0.05}
          toneMapped={false}
        />
      </mesh>

    </group>
  );
}

export type Logo3DProps = {
  active: boolean;
  reducedMotion: boolean;
};

export default function Logo3D({ active, reducedMotion }: Logo3DProps) {
  const hoverRef = useRef(false);
  const dragRef = useRef({ dragging: false, delta: 0 });
  const lastX = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current.dragging = true;
    lastX.current = e.clientX;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging || lastX.current === null) return;
    dragRef.current.delta += (e.clientX - lastX.current) * 0.01;
    lastX.current = e.clientX;
  };
  const endDrag = (e: React.PointerEvent) => {
    dragRef.current.dragging = false;
    lastX.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      className="h-full w-full touch-pan-y"
      onPointerEnter={() => (hoverRef.current = true)}
      onPointerLeave={(e) => {
        hoverRef.current = false;
        endDrag(e);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop={active ? "always" : "never"}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 3.4], fov: 38 }}
        style={{ background: "transparent" }}
        shadows
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 5]} intensity={1.5} castShadow />
        <directionalLight position={[-4, -1, -3]} intensity={0.5} color="#4aa8ff" />
        <Suspense fallback={null}>
          <Medallion
            speed={(Math.PI * 2) / 10}
            hoverRef={hoverRef}
            dragRef={dragRef}
            reducedMotion={reducedMotion}
          />
          <ContactShadows
            position={[0, -1.35, 0]}
            opacity={0.45}
            scale={5}
            blur={2.6}
            far={3}
            color="#020617"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
