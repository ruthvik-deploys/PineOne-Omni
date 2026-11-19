"use client";

import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef } from "react";
import type { ControlValues } from "@/components/controls";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { controlsSchema } from "./data";
import { createParticles, positionAt } from "./simulation";

type Settings = ControlValues<typeof controlsSchema>;

/**
 * Draws onto a transparent canvas over `bg-background`, so the page colour comes from tokens.
 * Trails fade to transparent with `destination-out` instead of painting a hardcoded background.
 */
export function OrbitCanvas({ settings }: { settings: Settings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(settings);
  const { resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const particles = useMemo(() => createParticles(settings.count), [settings.count]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Additive blending glows on dark; on light it washes out to white, so use normal blending there.
    const blend: GlobalCompositeOperation = resolvedTheme === "light" ? "source-over" : "lighter";
    let frame = 0;
    let clock = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = (now: number) => {
      const s = settingsRef.current;
      // Reduced motion: the clock stands still, so the field is a static picture that still follows the controls.
      if (!reducedMotion) clock += ((now - last) / 1000) * s.speed;
      last = now;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${reducedMotion ? 1 : 1 - s.trail})`;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = blend;
      ctx.fillStyle = s.color;
      const center = { x: w / 2, y: h / 2 };
      const half = Math.min(w, h) * 0.45;
      for (const p of particles) {
        const { x, y } = positionAt(p, clock, s.mode, center, half);
        ctx.beginPath();
        ctx.arc(x, y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [particles, resolvedTheme, reducedMotion]);

  return <canvas ref={canvasRef} aria-label="Orbiting particles" className="absolute inset-0 size-full bg-background" />;
}
