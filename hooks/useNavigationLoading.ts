"use client";

import { createContext, useContext } from "react";

interface NavigationLoadingContextValue {
  startNavigation: (navigate: () => void) => void;
}

export const NavigationLoadingContext = createContext<NavigationLoadingContextValue>({
  startNavigation: (navigate) => navigate(),
});

export function useNavigationLoading() {
  return useContext(NavigationLoadingContext);
}
