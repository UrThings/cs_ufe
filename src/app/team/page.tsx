import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeading } from "@/components/layout/PageHeading";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { TeamDashboard } from "@/features/team/ui/TeamDashboard";
import { TeamJoinCreatePanel } from "@/features/team/ui/TeamJoinCreatePanel";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getTeamForUser, TeamServiceError } from "@/features/team/services/team.service";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  let team = null;
  let teamError: TeamServiceError | null = null;

  try {
    team = await getTeamForUser(user.id);
  } catch (error) {
    if (error instanceof TeamServiceError) {
      teamError = error;
    } else {
      throw error;
    }
  }

  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Team Management"
          title="Team workspace"
          description="Team үүсгэх, багт орох, roster харах, тоглолтын мэдээллээ нэг дор удирдана."
          badge="Max 5 Members"
        />
        {team ? (
          <TeamDashboard team={team} currentUserId={user.id} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-200/75">{teamError?.message ?? "You are not part of a team yet."}</p>
            <TeamJoinCreatePanel />
          </div>
        )}
      </AnimatedPage>
    </MainLayout>
  );
}

