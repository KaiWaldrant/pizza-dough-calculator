import { useEffect, useState } from "react";

/**
 * Runs `load` when the component mounts or a dependency changes and returns its result,
 * or undefined while it is loading. A result that arrives after unmounting is dropped.
 */
export function useLoad<T>(load: () => Promise<T>, dependencies: unknown[]): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    let current = true;
    setValue(undefined);
    load().then((loaded) => current && setValue(loaded));
    return () => {
      current = false;
    };
    // The caller lists what `load` depends on, as with useEffect.
  }, dependencies);
  return value;
}
