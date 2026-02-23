import Link from "next/link";
import { notFound } from "next/navigation";
import { TournamentDetailPanel } from "@/components/tournament/TournamentDetailPanel";
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

export default async function TournamentDetailPage({ params }: RouteContext) {
  const { tournamentId: tournamentIdParam } = await params;
  const tournamentId = Number(tournamentIdParam);

  if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
    notFound();
  }

  const user = await getCurrentUser();

  const [tournament, settingsRows, membership] = await Promise.all([
    prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
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
        _count: {
          select: {
            participants: true,
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
    user
      ? prisma.teamMember.findUnique({
          where: { userId: user.id },
          select: {
            role: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : null,
  ]);

  if (!tournament) {
    notFound();
  }

  const settings = settingsRows[0] ?? { teamLimit: 16, matchBestOf: 1, finalBestOf: 1 };
  const viewerTeamId = membership?.team.id ?? null;

  const [joinedEntry, requestRows] = viewerTeamId
    ? await Promise.all([
        prisma.tournamentTeam.findUnique({
          where: {
            tournamentId_teamId: {
              tournamentId,
              teamId: viewerTeamId,
            },
          },
          select: { id: true },
        }),
        prisma.$queryRaw<Array<{ status: "PENDING" | "APPROVED" | "REJECTED" }>>`
          SELECT "status"
          FROM "TournamentJoinRequest"
          WHERE "tournamentId" = ${tournamentId}
            AND "teamId" = ${viewerTeamId}
          LIMIT 1
        `.catch(() => []),
      ])
    : [null, []];

  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Tournament"
          title={tournament.title}
          description="Overview, teams, match history, bracket."
          badge={tournament.status}
        />
        <Link href="/tournament" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-4")}>
          Back to tournaments
        </Link>

        <TournamentDetailPanel
          tournament={{
            id: tournament.id,
            title: tournament.title,
            status: tournament.status,
            startDate: tournament.startDate.toISOString(),
            headliner: tournament.headliner,
            participantsCount: tournament._count.participants,
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
            matches: tournament.matches.map((match) => ({
              ...match,
              scheduledAt: match.scheduledAt.toISOString(),
              completedAt: match.completedAt ? match.completedAt.toISOString() : null,
            })),
          }}
          viewer={{
            loggedIn: Boolean(user),
            teamId: viewerTeamId,
            teamName: membership?.team.name ?? null,
            teamRole: membership?.role ?? null,
            isJoined: Boolean(joinedEntry),
            requestStatus: requestRows[0]?.status ?? null,
          }}
        />
      </AnimatedPage>
    </MainLayout>
  );
}
