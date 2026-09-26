import { Suspense } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChartContainer } from "@/components/chart/ChartContainer";
import { ChartSkeleton } from "@/components/chart/ChartSkeleton";
import { SymbolsProvider } from "@/components/providers/SymbolsProvider";
import { fetchSymbolsServer } from "@/lib/api.server";

export default function Home() {
  const symbolsPromise = fetchSymbolsServer();

  return (
    <SymbolsProvider promise={symbolsPromise}>
      <Suspense fallback={<ChartSkeleton />}>
        <DashboardLayout>
          <Suspense fallback={<ChartSkeleton />}>
            <ChartContainer />
          </Suspense>
        </DashboardLayout>
      </Suspense>
    </SymbolsProvider>
  );
}
