import { useEffect, useState } from "react";
import { loadJSON, saveJSON } from "../store/storage";

/** useState that survives page reloads (stored per app via the storage prefix). */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => loadJSON<T>(key, initial));
  useEffect(() => saveJSON(key, value), [key, value]);
  return [value, setValue] as const;
}
