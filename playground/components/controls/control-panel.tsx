"use client";

import { RotateCcw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { Control, ControlSchema } from "./schema";
import type { ControlsState } from "./use-controls";

export function ControlPanel<S extends ControlSchema>({ controls }: { controls: ControlsState<S> }) {
  const { schema, values, set, reset, randomize } = controls;
  return (
    <div className="flex flex-col gap-5">
      {Object.entries(schema).map(([key, control]) => (
        <ControlField
          key={key}
          id={`control-${key}`}
          control={control}
          value={values[key]}
          onChange={(v) => set(key, v as never)}
        />
      ))}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button variant="secondary" className="h-11" onClick={randomize}>
          <Shuffle />
          Randomize
        </Button>
        <Button variant="ghost" className="h-11" onClick={reset}>
          <RotateCcw />
          Reset
        </Button>
      </div>
    </div>
  );
}

function ControlField({
  id,
  control,
  value,
  onChange,
}: {
  id: string;
  control: Control;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (control.type === "toggle") {
    return (
      <label htmlFor={id} className="flex min-h-11 items-center justify-between gap-4 text-sm">
        {control.label}
        <Switch id={id} checked={value as boolean} onCheckedChange={onChange} />
      </label>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <label htmlFor={id}>{control.label}</label>
        {control.type === "slider" && <span className="text-muted-foreground tabular-nums">{value as number}</span>}
      </div>
      {control.type === "slider" && (
        <Slider
          id={id}
          className="py-3"
          min={control.min}
          max={control.max}
          step={control.step ?? 1}
          value={[value as number]}
          onValueChange={([v]) => onChange(v)}
        />
      )}
      {control.type === "select" && (
        <NativeSelect id={id} className="h-11 w-full" value={value as string} onChange={(e) => onChange(e.target.value)}>
          {control.options.map((o) => (
            <NativeSelectOption key={o} value={o}>
              {o}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
      {control.type === "color" && (
        <input
          id={id}
          type="color"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full cursor-pointer rounded-lg border border-border bg-transparent p-1"
        />
      )}
    </div>
  );
}
