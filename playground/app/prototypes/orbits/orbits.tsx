"use client";

import { ControlPanel, ControlsLayout, useControls } from "@/components/controls";
import { STORAGE_NAMESPACE, controlsSchema } from "./data";
import { OrbitCanvas } from "./orbit-canvas";

export function Orbits() {
  const controls = useControls(STORAGE_NAMESPACE, controlsSchema);
  return (
    <ControlsLayout panel={<ControlPanel controls={controls} />}>
      <OrbitCanvas settings={controls.values} />
    </ControlsLayout>
  );
}
