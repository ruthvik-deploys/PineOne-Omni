export type Mode = "orbit" | "spiral" | "swarm";

/** Immutable per-particle seed. Positions are derived from it and the clock, never stored. */
export type Particle = {
  radius: number; // 0..1 of the available half-size
  phase: number; // starting angle, radians
  drift: number; // personal speed multiplier
  wobble: number; // personal wobble phase
};

export type Point = { x: number; y: number };
