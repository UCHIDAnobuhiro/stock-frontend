import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { NavigationLoadingProvider } from "@/components/providers/NavigationLoadingProvider";
import { AppRoutes } from "./routes";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <NavigationLoadingProvider>
          <TooltipProvider>
            <AppRoutes />
          </TooltipProvider>
        </NavigationLoadingProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
