import { MainLayout } from "@/components/layout/MainLayout";
import { PageSkeleton } from "@/components/feedback/PageSkeleton";

export default function AuthRegisterLoading() {
  return (
    <MainLayout>
      <PageSkeleton title="Loading registration form" />
    </MainLayout>
  );
}
