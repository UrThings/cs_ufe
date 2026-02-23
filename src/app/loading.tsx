import { PageSkeleton } from "@/components/feedback/PageSkeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function RootLoading() {
  return (
    <MainLayout>
      <PageSkeleton title="Booting workspace" />
    </MainLayout>
  );
}
