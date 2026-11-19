// Safe, namespaced localStorage. Call only from effects or event handlers (never during render).

function key(namespace: string, name: string) {
  return `playground:${namespace}:${name}`;
}

export function readStored<T>(namespace: string, name: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key(namespace, name));
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStored<T>(namespace: string, name: string, value: T) {
  try {
    window.localStorage.setItem(key(namespace, name), JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode). Ignore.
  }
}

export function clearStored(namespace: string, name: string) {
  try {
    window.localStorage.removeItem(key(namespace, name));
  } catch {
    // Ignore.
  }
}
