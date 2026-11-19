import { defineControls } from "@/components/controls";

export const STORAGE_NAMESPACE = "orbits";
export const MODES = ["orbit", "spiral", "swarm"] as const;

export const controlsSchema = defineControls({
  count: { type: "slider", label: "Particles", min: 50, max: 1500, step: 10, default: 600 },
  speed: { type: "slider", label: "Speed", min: 0.1, max: 3, step: 0.1, default: 1 },
  size: { type: "slider", label: "Size", min: 0.5, max: 4, step: 0.1, default: 1.4 },
  trail: { type: "slider", label: "Trail", min: 0, max: 0.95, step: 0.05, default: 0.8 },
  mode: { type: "select", label: "Motion", options: MODES, default: "orbit" },
  color: { type: "color", label: "Colour", default: "#7c9cff" },
});
