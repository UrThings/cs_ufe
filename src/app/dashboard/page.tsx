import Link from "next/link";
import { Activity, ShieldCheck, Users2, Wallet } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeading } from "@/components/layout/PageHeading";
import { AnimatedPage, StaggerItem, StaggerList } from "@/components/motion/AnimatedPage";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const [paidTeams, activeTournaments, playerCount, pendingMatches, upcomingTournaments, recentMatches] = await Promise.all([
    prisma.team.count({ where: { isPaid: true } }),
    prisma.tournament.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.match.count({ where: { status: { in: ["SCHEDULED", "LIVE"] } } }),
    prisma.tournament.findMany({
      where: { status: { in: ["DRAFT", "ACTIVE"] } },
      orderBy: { startDate: "asc" },
      take: 5,
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
    }),
    prisma.match.findMany({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 6,
      select: {
        id: true,
        round: true,
        homeScore: true,
        awayScore: true,
        completedAt: true,
        tournament: { select: { title: true } },
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    }),
  ]);

  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Student Dashboard"
          title="UFE league overview"
          description="See active tournaments, paid teams, and recent match outcomes across the campus league."
          badge="Live"
        />

        <StaggerList>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <StatCard
                label="Paid Teams"
                value={String(paidTeams)}
                hint="Ready for approvals"
                icon={<Wallet className="h-5 w-5" />}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Active Tournaments"
                value={String(activeTournaments)}
                hint="Currently running"
                icon={<ShieldCheck className="h-5 w-5" />}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Registered Players"
                value={String(playerCount)}
                hint="All UFE accounts"
                icon={<Users2 className="h-5 w-5" />}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Pending Matches"
                value={String(pendingMatches)}
                hint="Scheduled + live"
                icon={<Activity className="h-5 w-5" />}
              />
            </StaggerItem>
          </section>
        </StaggerList>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border border-amber-500/30 bg-[#15171b]/72">
            <CardHeader className="flex items-center justify-between gap-2 sm:flex-row">
              <CardTitle>Upcoming tournaments</CardTitle>
              <Link href="/tournament" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingTournaments.length === 0 ? (
                <p className="text-sm text-zinc-200/75">No upcoming tournaments.</p>
              ) : (
                upcomingTournaments.map((tournament) => (
                  <Link
                    key={tournament.id}
                    href={`/tournament/${tournament.id}`}
                    className="block rounded-xl border border-amber-400/25 bg-amber-950/30 p-3 transition hover:border-amber-300/45"
                  >
                    <p className="text-sm text-zinc-100">{tournament.title}</p>
                    <p className="mt-1 text-xs text-zinc-200/75">
                      {tournament.status} | Teams: {tournament._count.participants}
                    </p>
                    <p className="mt-1 text-xs text-zinc-200/65">
                      Start: {new Date(tournament.startDate).toLocaleString()}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border border-amber-500/30 bg-[#15171b]/72">
            <CardHeader>
              <CardTitle>Recent results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentMatches.length === 0 ? (
                <p className="text-sm text-zinc-200/75">No completed matches yet.</p>
              ) : (
                recentMatches.map((match) => (
                  <div key={match.id} className="rounded-xl border border-amber-400/20 bg-black/25 p-3 text-sm">
                    <Badge className="mb-2 w-fit">ROUND {match.round}</Badge>
                    <p className="text-zinc-100">
                      {match.homeTeam.name} {match.homeScore ?? "-"}:{match.awayScore ?? "-"} {match.awayTeam?.name ?? "BYE"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-200/75">{match.tournament.title}</p>
                    <p className="mt-1 text-xs text-zinc-200/65">
                      {match.completedAt ? new Date(match.completedAt).toLocaleString() : "-"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </AnimatedPage>
    </MainLayout>
  );
}
