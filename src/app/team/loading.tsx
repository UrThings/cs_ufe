import { PageSkeleton } from "@/components/feedback/PageSkeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function TeamLoading() {
  return (
    <MainLayout>
      <PageSkeleton title="Loading team workspace" />
    </MainLayout>
  );
}
