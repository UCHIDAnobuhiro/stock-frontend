import { Suspense } from "react";
import { SWRConfig } from "swr";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChartContainer } from "@/components/chart/ChartContainer";
import { ChartSkeleton } from "@/components/chart/ChartSkeleton";
import { fetchSymbolsServer } from "@/lib/api.server";

export default async function Home() {
  const symbols = await fetchSymbolsServer();

  return (
    <SWRConfig value={{ fallback: { "/v1/symbols": symbols } }}>
      <Suspense fallback={<ChartSkeleton />}>
        <DashboardLayout>
          <Suspense fallback={<ChartSkeleton />}>
            <ChartContainer />
          </Suspense>
        </DashboardLayout>
      </Suspense>
    </SWRConfig>
  );
}
