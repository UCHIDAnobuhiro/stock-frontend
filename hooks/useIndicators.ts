import { useState, useCallback } from "react";

export function useIndicators() {
  const [smaEnabled, setSmaEnabled] = useState(false);

  const toggleSma = useCallback(() => {
    setSmaEnabled((v) => !v);
  }, []);

  return { smaEnabled, toggleSma };
}
