// Control schema: describe tunable parameters once; the panel, persistence, Reset and Randomize come for free.
// Pure module (no React) so it can be tested directly.

export type SliderControl = { type: "slider"; label: string; min: number; max: number; step?: number; default: number };
export type ToggleControl = { type: "toggle"; label: string; default: boolean };
export type SelectControl = { type: "select"; label: string; options: readonly string[]; default: string };
export type ColorControl = { type: "color"; label: string; default: string };
export type Control = SliderControl | ToggleControl | SelectControl | ColorControl;
export type ControlSchema = Record<string, Control>;

type ValueOf<C extends Control> = C extends SliderControl
  ? number
  : C extends ToggleControl
    ? boolean
    : C extends SelectControl
      ? C["options"][number]
      : string;

export type ControlValues<S extends ControlSchema> = { -readonly [K in keyof S]: ValueOf<S[K]> };

/** Identity helper that keeps literal option types: `defineControls({ mode: { type: "select", options: ["a", "b"], ... } })`. */
export function defineControls<const S extends ControlSchema>(schema: S): S {
  return schema;
}

export function defaultValues<S extends ControlSchema>(schema: S): ControlValues<S> {
  return Object.fromEntries(Object.entries(schema).map(([k, c]) => [k, c.default])) as ControlValues<S>;
}

function snap(value: number, c: SliderControl) {
  const step = c.step ?? 1;
  const snapped = Math.round((value - c.min) / step) * step + c.min;
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Math.min(c.max, Math.max(c.min, Number(snapped.toFixed(decimals))));
}

function randomHex(rand: () => number) {
  const h = rand() * 360;
  const s = 0.55 + rand() * 0.35;
  const l = 0.5 + rand() * 0.15;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function randomValues<S extends ControlSchema>(schema: S, rand: () => number = Math.random): ControlValues<S> {
  const entries = Object.entries(schema).map(([k, c]) => {
    switch (c.type) {
      case "slider":
        return [k, snap(c.min + rand() * (c.max - c.min), c)];
      case "toggle":
        return [k, rand() < 0.5];
      case "select":
        return [k, c.options[Math.floor(rand() * c.options.length)]];
      case "color":
        return [k, randomHex(rand)];
    }
  });
  return Object.fromEntries(entries) as ControlValues<S>;
}

/** Keep only stored values that still fit the schema, so old localStorage can't break a prototype. */
export function sanitize<S extends ControlSchema>(schema: S, stored: unknown): ControlValues<S> {
  const values = defaultValues(schema) as Record<string, unknown>;
  if (!stored || typeof stored !== "object") return values as ControlValues<S>;
  for (const [k, c] of Object.entries(schema)) {
    const v = (stored as Record<string, unknown>)[k];
    if (c.type === "slider" && typeof v === "number" && Number.isFinite(v)) values[k] = snap(v, c);
    if (c.type === "toggle" && typeof v === "boolean") values[k] = v;
    if (c.type === "select" && typeof v === "string" && c.options.includes(v)) values[k] = v;
    if (c.type === "color" && typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) values[k] = v;
  }
  return values as ControlValues<S>;
}
