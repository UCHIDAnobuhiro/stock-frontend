"use client";

import { useCallback, useTransition, type ReactNode } from "react";
import { PageLoadingScreen } from "@/components/ui/LoadingIndicator";
import { NavigationLoadingContext } from "@/hooks/useNavigationLoading";

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
