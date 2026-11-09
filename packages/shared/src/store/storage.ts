let prefix = "app";
/** Call once per app BEFORE creating the store so user-panel and admin-panel don't share keys. */
export const setStoragePrefix = (p: string) => (prefix = p);

export const loadJSON = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(`${prefix}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
export const saveJSON = (key: string, value: unknown) => {
  try {
    if (value === null || value === undefined) localStorage.removeItem(`${prefix}:${key}`);
    else localStorage.setItem(`${prefix}:${key}`, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};
