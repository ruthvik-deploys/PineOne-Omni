"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readStored, writeStored } from "@/lib/storage";
import { type ControlSchema, type ControlValues, defaultValues, randomValues, sanitize } from "./schema";

/**
 * State for a control schema, persisted per prototype in localStorage.
 * Values start at the defaults (same on server and client) and load from storage on mount.
 */
export function useControls<S extends ControlSchema>(namespace: string, schema: S) {
  const [values, setValues] = useState<ControlValues<S>>(() => defaultValues(schema));
  const loaded = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is client-only, so it must load after mount
    setValues(sanitize(schema, readStored(namespace, "controls", null)));
    loaded.current = true;
  }, [namespace, schema]);

  useEffect(() => {
    if (loaded.current) writeStored(namespace, "controls", values);
  }, [namespace, values]);

  const set = useCallback(<K extends keyof S>(key: K, value: ControlValues<S>[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);
  const reset = useCallback(() => setValues(defaultValues(schema)), [schema]);
  const randomize = useCallback(() => setValues(randomValues(schema)), [schema]);

  return { schema, values, set, reset, randomize };
}

export type ControlsState<S extends ControlSchema> = ReturnType<typeof useControls<S>>;
