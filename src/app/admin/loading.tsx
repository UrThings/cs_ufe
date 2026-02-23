import { PageSkeleton } from "@/components/feedback/PageSkeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function AdminLoading() {
  return (
    <MainLayout>
      <PageSkeleton title="Loading admin console" />
    </MainLayout>
  );
}
