import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import logoAsset from "@/assets/tatuverso3d-logo.png.asset.json";

const Logo3D = lazy(() => import("@/components/brand/Logo3D"));

/** Altura/largura reservadas por breakpoint — evita mudança de layout no carregamento. */
const BOX = "h-[260px] w-[260px] md:h-[330px] md:w-[330px] lg:h-[410px] lg:w-[410px]";

function StaticLogo() {
  return (
    <img
      src={logoAsset.url}
      alt="Logo TatuVerso3D"
      className="h-full w-full object-contain"
      loading="lazy"
      decoding="async"
    />
  );
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function Showcase() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setWebgl(supportsWebGL());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setVisible(entries[0]?.isIntersecting ?? true), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={boxRef} className={BOX} aria-label="Logo TatuVerso3D em 3D" role="img">
      {webgl === false ? (
        <StaticLogo />
      ) : webgl === true ? (
        <Suspense fallback={<StaticLogo />}>
          <Logo3D active={visible} reducedMotion={reducedMotion} />
        </Suspense>
      ) : (
        <StaticLogo />
      )}
    </div>
  );
}

export function LogoShowcase() {
  return (
    <ClientOnly fallback={<div className={BOX} aria-hidden />}>
      <Showcase />
    </ClientOnly>
  );
}
