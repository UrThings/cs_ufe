import { prisma } from "@/lib/prisma";

export type PlatformMetrics = {
  teams: number;
  tournaments: number;
  matches: number;
  paidTeams: number;
};

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const [teams, tournaments, matches, paidTeams] = await Promise.all([
    prisma.team.count(),
    prisma.tournament.count(),
    prisma.match.count(),
    prisma.team.count({ where: { isPaid: true } }),
  ]);

  return {
    teams,
    tournaments,
    matches,
    paidTeams,
  };
}
