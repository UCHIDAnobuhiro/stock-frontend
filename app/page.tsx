import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChartContainer } from "@/components/chart/ChartContainer";

export default function Home() {
  return (
    <DashboardLayout>
      <ChartContainer />
    </DashboardLayout>
  );
}
