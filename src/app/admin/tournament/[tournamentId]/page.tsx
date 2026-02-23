import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminTournamentDetail } from "@/components/admin/AdminTournamentDetail";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeading } from "@/components/layout/PageHeading";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { buttonVariants } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type RouteContext = {
  params: Promise<{
    tournamentId: string;
  }>;
};

export default async function AdminTournamentDetailPage({ params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const { tournamentId: tournamentIdParam } = await params;
  const tournamentId = Number(tournamentIdParam);
  if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
    notFound();
  }

  const [tournament, settingsRows, pendingRequests] = await Promise.all([
    prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        title: true,
        format: true,
        status: true,
        startDate: true,
        endDate: true,
        headliner: true,
        participants: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                description: true,
                members: {
                  select: {
                    role: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                  orderBy: { joinedAt: "asc" },
                },
              },
            },
          },
        },
        matches: {
          orderBy: [{ round: "asc" }, { position: "asc" }],
          select: {
            id: true,
            round: true,
            position: true,
            status: true,
            winnerTeamId: true,
            homeScore: true,
            awayScore: true,
            scheduledAt: true,
            completedAt: true,
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.$queryRaw<Array<{ teamLimit: number; matchBestOf: number; finalBestOf: number }>>`
      SELECT "teamLimit", "matchBestOf", "finalBestOf"
      FROM "TournamentSettings"
      WHERE "tournamentId" = ${tournamentId}
      LIMIT 1
    `.catch(() => []),
    prisma.$queryRaw<
      Array<{
        id: number;
        teamId: number;
        teamName: string;
        captainName: string | null;
        captainEmail: string;
        requestedAt: Date;
      }>
    >`
      SELECT
        r."id",
        r."teamId",
        team."name" AS "teamName",
        u."name" AS "captainName",
        u."email" AS "captainEmail",
        r."requestedAt"
      FROM "TournamentJoinRequest" r
      INNER JOIN "Team" team
        ON team."id" = r."teamId"
      INNER JOIN "User" u
        ON u."id" = r."requestedByUserId"
      WHERE r."tournamentId" = ${tournamentId}
        AND r."status" = 'PENDING'
      ORDER BY r."requestedAt" DESC
    `.catch(() => []),
  ]);

  if (!tournament) {
    notFound();
  }

  const settings = settingsRows[0] ?? { teamLimit: 16, matchBestOf: 1, finalBestOf: 1 };

  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Admin Tournament"
          title={tournament.title}
          description="Оролцогч багууд, captain хүсэлтүүд, bracket старт болон match winner control."
          badge={tournament.status}
        />
        <Link href="/admin/tournament" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-4")}>
          Back to all tournaments
        </Link>
        <AdminTournamentDetail
          tournament={{
            id: tournament.id,
            title: tournament.title,
            format: tournament.format,
            status: tournament.status,
            startDate: tournament.startDate.toISOString(),
            endDate: tournament.endDate ? tournament.endDate.toISOString() : null,
            headliner: tournament.headliner,
            teamLimit: settings.teamLimit,
            matchBestOf: settings.matchBestOf,
            finalBestOf: settings.finalBestOf,
            teams: tournament.participants.map((participant) => ({
              id: participant.team.id,
              name: participant.team.name,
              description: participant.team.description,
              members: participant.team.members.map((member) => ({
                id: member.user.id,
                name: member.user.name,
                email: member.user.email,
                role: member.role,
              })),
            })),
            pendingRequests: pendingRequests.map((request) => ({
              id: request.id,
              teamId: request.teamId,
              teamName: request.teamName,
              captainName: request.captainName,
              captainEmail: request.captainEmail,
              requestedAt: request.requestedAt.toISOString(),
            })),
            matches: tournament.matches.map((match) => ({
              ...match,
              scheduledAt: match.scheduledAt.toISOString(),
              completedAt: match.completedAt ? match.completedAt.toISOString() : null,
            })),
          }}
        />
      </AnimatedPage>
    </MainLayout>
  );
}
