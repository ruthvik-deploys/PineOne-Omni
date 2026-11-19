# Orbits

## What It Does
Hundreds of particles circle the centre of the screen, with tunable count, speed, size, trail, motion and colour. It is the reference prototype: copy its shape when building a new one.

## Architecture
```
data.ts (controlsSchema) ──► useControls ──► values ──► ControlPanel (side column / bottom sheet)
                                 │  ▲
                     localStorage │  │ load on mount
                                 ▼  │
                       playground:orbits:controls
values ──► OrbitCanvas ──► createParticles(count)  (simulation.ts, seeded)
                     └──► requestAnimationFrame loop ──► positionAt(p, t, mode) ──► canvas 2D
```

## Frontend
- **State:** one `useControls("orbits", controlsSchema)` call holds every setting and persists it. Reset restores defaults; Randomize picks a random value for every control.
- **Rendering:** the particle seeds are memoised per `count`. Positions are derived from the seed and the clock each frame, never stored. Settings are read through a ref, so moving a slider doesn't restart the loop.
- **Theme:** the canvas is transparent over `bg-background`. Trails fade with `destination-out`, so no background colour is hardcoded. `resolvedTheme` switches the blend mode (additive on dark, normal on light), which is a behaviour change rather than a colour change.
- **Reduced motion:** the clock stops and trails are off, leaving a static picture that still follows the controls.
- **Responsive:** the canvas fills the subject area. From `lg` the controls sit in a 320px side column; below that a Controls button (icon only under `sm`) opens a bottom sheet. Tap targets are 44px.

## Key Dependencies
- `@/components/controls`: schema, `useControls`, `ControlPanel` and `ControlsLayout`
- `next-themes`: `resolvedTheme` for the blend mode
- `@/hooks/use-reduced-motion`

## Component Tree
```
page.tsx
└── Orbits (orbits.tsx)
    └── ControlsLayout
        ├── OrbitCanvas (orbit-canvas.tsx)
        └── ControlPanel (panel)
```

## Error Handling
- If there's no 2D context, the canvas stays blank and doesn't crash.
- Stored settings are sanitised against the schema, so a bad or outdated localStorage value falls back to the default.
- Storage access is wrapped in try/catch (`@/lib/storage`).

## File Structure
```
orbits/
├── page.tsx          thin route entry
├── orbits.tsx        wires the controls to the canvas
├── orbit-canvas.tsx  canvas and animation loop
├── simulation.ts     pure maths (PRNG, particle seeds, positions)
├── data.ts           control schema and storage namespace
├── types.ts          Particle, Point, Mode
├── metadata.json
└── HOW_IT_WORKS.md
```
