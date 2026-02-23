import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminTeamDetail } from "@/components/admin/AdminTeamDetail";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeading } from "@/components/layout/PageHeading";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { buttonVariants } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type RouteContext = {
  params: Promise<{
    teamId: string;
  }>;
};

export default async function AdminTeamDetailPage({ params }: RouteContext) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const { teamId: teamIdParam } = await params;
  const teamId = Number(teamIdParam);
  if (!Number.isInteger(teamId) || teamId <= 0) {
    notFound();
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      slug: true,
      teamCode: true,
      description: true,
      isPaid: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      members: {
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      tournaments: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
        },
      },
      tournamentEntries: {
        orderBy: { joinedAt: "desc" },
        take: 12,
        select: {
          joinedAt: true,
          tournament: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    notFound();
  }

  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Admin Team"
          title={team.name}
          description="Team profile, members, and tournament relations."
          badge={team.isPaid ? "PAID" : "PENDING"}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/dashboard?view=teams" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Back to teams
          </Link>
          <Link
            href={`/admin/dashboard/users/${team.owner.id}`}
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Open owner
          </Link>
        </div>
        <AdminTeamDetail
          team={{
            id: team.id,
            name: team.name,
            slug: team.slug,
            teamCode: team.teamCode,
            description: team.description,
            isPaid: team.isPaid,
            paidAt: team.paidAt ? team.paidAt.toISOString() : null,
            createdAt: team.createdAt.toISOString(),
            updatedAt: team.updatedAt.toISOString(),
            owner: {
              id: team.owner.id,
              name: team.owner.name,
              email: team.owner.email,
            },
            members: team.members.map((member) => ({
              id: member.id,
              role: member.role,
              joinedAt: member.joinedAt.toISOString(),
              userId: member.user.id,
              userName: member.user.name,
              userEmail: member.user.email,
            })),
            hostedTournaments: team.tournaments.map((tournament) => ({
              id: tournament.id,
              title: tournament.title,
              status: tournament.status,
              startDate: tournament.startDate.toISOString(),
            })),
            joinedTournaments: team.tournamentEntries.map((entry) => ({
              id: entry.tournament.id,
              title: entry.tournament.title,
              status: entry.tournament.status,
              joinedAt: entry.joinedAt.toISOString(),
            })),
          }}
        />
      </AnimatedPage>
    </MainLayout>
  );
}
