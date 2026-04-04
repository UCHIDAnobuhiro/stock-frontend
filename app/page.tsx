import { Suspense } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChartContainer } from "@/components/chart/ChartContainer";
import { ChartSkeleton } from "@/components/chart/ChartSkeleton";

export default function Home() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <DashboardLayout>
        <Suspense fallback={<ChartSkeleton />}>
          <ChartContainer />
        </Suspense>
      </DashboardLayout>
    </Suspense>
  );
}
