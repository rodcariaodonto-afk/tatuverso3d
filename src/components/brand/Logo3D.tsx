import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import modelAsset from "@/assets/tatuverso3d-logo.glb.asset.json";

type ReliefProps = {
  speed: number;
  hoverRef: React.RefObject<boolean>;
  dragRef: React.RefObject<{ dragging: boolean; delta: number }>;
  reducedMotion: boolean;
};

function LogoRelief({ speed, hoverRef, dragRef, reducedMotion }: ReliefProps) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelAsset.url);

  // Instância própria, com sombras próprias entre os níveis de relevo.
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.roughness = 0.5;
        mat.metalness = 0.18;
        if (mat.map) mat.map.anisotropy = 8;
      }
    });
    // Peça em pé, largura 1 → escala para preencher a moldura.
    clone.scale.setScalar(1.55);
    return clone;
  }, [scene]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(delta, 0.05);

    if (dragRef.current?.delta) {
      g.rotation.y += dragRef.current.delta;
      dragRef.current.delta = 0;
    }

    if (!reducedMotion && !dragRef.current?.dragging) {
      const factor = hoverRef.current ? 0.4 : 1;
      g.rotation.y += speed * factor * d;
    }

    if (!reducedMotion) {
      g.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.04;
    }
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(modelAsset.url);

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
        {/* luz ambiente + frontal + lateral + contorno */}
        <ambientLight intensity={0.65} />
        <directionalLight position={[2, 3, 4]} intensity={2.1} castShadow />
        <directionalLight position={[-3.5, 1, 2]} intensity={1.1} color="#66aaff" />
        <directionalLight position={[0, 1.2, -4]} intensity={1.8} color="#08CFFF" />
        <Suspense fallback={null}>
          <LogoRelief
            speed={(Math.PI * 2) / 11}
            hoverRef={hoverRef}
            dragRef={dragRef}
            reducedMotion={reducedMotion}
          />
          <ContactShadows
            position={[0, -1.25, 0]}
            opacity={0.4}
            scale={5}
            blur={2.8}
            far={3}
            color="#020617"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
