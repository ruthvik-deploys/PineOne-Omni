// Pure maths: no React, no canvas. Testable on its own.
import type { Mode, Particle, Point } from "./types";

/** Deterministic PRNG so the same count always gives the same field. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createParticles(count: number, seed = 7): Particle[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    radius: 0.08 + Math.sqrt(rand()) * 0.92,
    phase: rand() * Math.PI * 2,
    drift: 0.6 + rand() * 0.8,
    wobble: rand() * Math.PI * 2,
  }));
}

/** Where a particle is at time `t` (seconds) around `center`, within `half` pixels. */
export function positionAt(p: Particle, t: number, mode: Mode, center: Point, half: number): Point {
  // Inner particles move faster, like a little solar system.
  const angular = (p.drift * 0.6) / Math.sqrt(p.radius);
  const angle = p.phase + t * angular;
  let r = p.radius;
  if (mode === "spiral") r *= 0.55 + 0.45 * Math.sin(t * 0.5 * p.drift + p.wobble);
  if (mode === "swarm") r *= 1 + 0.18 * Math.sin(t * 2.2 * p.drift + p.wobble);
  return { x: center.x + Math.cos(angle) * r * half, y: center.y + Math.sin(angle) * r * half };
}
