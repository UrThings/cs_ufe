import { MainLayout } from "@/components/layout/MainLayout";
import { PageSkeleton } from "@/components/feedback/PageSkeleton";

export default function AuthLoginLoading() {
  return (
    <MainLayout>
      <PageSkeleton title="Loading login form" />
    </MainLayout>
  );
}
