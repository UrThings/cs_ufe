import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeading } from "@/components/layout/PageHeading";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { TournamentLobby } from "@/components/tournament/TournamentLobby";
import { prisma } from "@/lib/prisma";

export default async function TournamentPage() {
  const [tournaments, settingsRows] = await Promise.all([
    prisma.tournament.findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        _count: {
          select: {
            participants: true,
          },
        },
      },
      take: 30,
    }),
    prisma.$queryRaw<Array<{ tournamentId: number; teamLimit: number; matchBestOf: number; finalBestOf: number }>>`
      SELECT "tournamentId", "teamLimit", "matchBestOf", "finalBestOf"
      FROM "TournamentSettings"
    `.catch(() => []),
  ]);

  const settingsMap = new Map(settingsRows.map((item) => [item.tournamentId, item]));

  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Tournament"
          title="All tournaments"
          description="Жагсаалтаас тэмцээн дээр дарж орж teams, request, bracket, match history-г харна."
          badge="List"
        />
        <TournamentLobby
          tournaments={tournaments.map((tournament) => {
            const settings = settingsMap.get(tournament.id) ?? {
              teamLimit: 16,
              matchBestOf: 1,
              finalBestOf: 1,
            };

            return {
              id: tournament.id,
              title: tournament.title,
              status: tournament.status,
              startDate: tournament.startDate.toISOString(),
              participantsCount: tournament._count.participants,
              teamLimit: settings.teamLimit,
              matchBestOf: settings.matchBestOf,
              finalBestOf: settings.finalBestOf,
            };
          })}
        />
      </AnimatedPage>
    </MainLayout>
  );
}
