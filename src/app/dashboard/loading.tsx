import { PageSkeleton } from "@/components/feedback/PageSkeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function DashboardLoading() {
  return (
    <MainLayout>
      <PageSkeleton title="Loading dashboard" />
    </MainLayout>
  );
}
