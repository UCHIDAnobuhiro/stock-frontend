"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { PageLoadingScreen } from "@/components/ui/LoadingIndicator";

type NavigationKind = "page" | "chart";

interface NavigationLoadingContextValue {
  isPagePending: boolean;
  isChartPending: boolean;
  startNavigation: (kind: NavigationKind, navigate: () => void) => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextValue>({
  isPagePending: false,
  isChartPending: false,
  startNavigation: (_kind, navigate) => navigate(),
});

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<NavigationKind | null>(null);
  const [isPending, startTransition] = useTransition();

  const startNavigation = useCallback(
    (nextKind: NavigationKind, navigate: () => void) => {
      setKind(nextKind);
      startTransition(navigate);
    },
    [],
  );

  return (
    <NavigationLoadingContext.Provider
      value={{
        isPagePending: isPending && kind === "page",
        isChartPending: isPending && kind === "chart",
        startNavigation,
      }}
    >
      {children}
      {isPending && kind === "page" && <PageLoadingScreen />}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  return useContext(NavigationLoadingContext);
}
