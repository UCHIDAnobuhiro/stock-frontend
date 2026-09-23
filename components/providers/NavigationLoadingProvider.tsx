"use client";

import {
  createContext,
  useCallback,
  useContext,
  useTransition,
  type ReactNode,
} from "react";
import { PageLoadingScreen } from "@/components/ui/LoadingIndicator";

interface NavigationLoadingContextValue {
  startNavigation: (navigate: () => void) => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextValue>({
  startNavigation: (navigate) => navigate(),
});

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();

  const startNavigation = useCallback(
    (navigate: () => void) => startTransition(navigate),
    [],
  );

  return (
    <NavigationLoadingContext.Provider
      value={{ startNavigation }}
    >
      {children}
      {isPending && <PageLoadingScreen />}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  return useContext(NavigationLoadingContext);
}
