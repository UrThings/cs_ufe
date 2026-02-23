import { PageSkeleton } from "@/components/feedback/PageSkeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export default function TournamentLoading() {
  return (
    <MainLayout>
      <PageSkeleton title="Loading tournament bracket" />
    </MainLayout>
  );
}
