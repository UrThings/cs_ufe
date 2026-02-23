import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminTournamentManager } from "@/components/admin/AdminTournamentManager";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeading } from "@/components/layout/PageHeading";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type AdminTournamentPageProps = {
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

type TournamentSettingsRow = {
  tournamentId: number;
  teamLimit: number;
  matchBestOf: number;
  finalBestOf: number;
};

function resolvePage(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
}

export default async function AdminTournamentPage({ searchParams }: AdminTournamentPageProps) {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const requestedPage = resolvePage(params.page);
  const totalTournaments = await prisma.tournament.count();
  const totalPages = Math.max(1, Math.ceil(totalTournaments / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      _count: {
        select: {
          participants: true,
          matches: true,
        },
      },
    },
    take: PAGE_SIZE,
    skip,
  });

  const tournamentIds = tournaments.map((tournament) => tournament.id);
  const settingsRows =
    tournamentIds.length > 0
      ? await prisma
          .$queryRaw<TournamentSettingsRow[]>`
            SELECT "tournamentId", "teamLimit", "matchBestOf", "finalBestOf"
            FROM "TournamentSettings"
          `
          .catch(() => [])
      : [];

  const settingsMap = new Map(settingsRows.map((row) => [row.tournamentId, row]));

  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Admin Tournament"
          title="UFE tournament control center"
          description="Create campus tournaments, review join requests, and control bracket progression from one panel."
          badge="ADMIN"
        />

        <AdminTournamentManager />

        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">All tournaments</h2>
            <Badge className="bg-amber-500/20 text-zinc-200">{totalTournaments}</Badge>
          </div>
          {tournaments.map((tournament) => {
            const settings = settingsMap.get(tournament.id);
            return (
              <Card key={tournament.id} className="border border-amber-500/35 bg-[#15171b]/70">
                <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
                  <div>
                    <CardTitle>{tournament.title}</CardTitle>
                    <p className="mt-1 text-xs text-zinc-200/70">
                      Start: {new Date(tournament.startDate).toLocaleString()}
                    </p>
                  </div>
                  <Badge>{tournament.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 text-xs text-zinc-200/80 sm:grid-cols-3">
                    <p>Teams: {tournament._count.participants}</p>
                    <p>Matches: {tournament._count.matches}</p>
                    <p>Limit: {settings?.teamLimit ?? 16}</p>
                    <p>Match BO: {settings?.matchBestOf ?? 1}</p>
                    <p>Final BO: {settings?.finalBestOf ?? 1}</p>
                  </div>
                  <Link
                    href={`/admin/tournament/${tournament.id}`}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    Open tournament
                  </Link>
                </CardContent>
              </Card>
            );
          })}
          {totalPages > 1 ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;
                return (
                  <Link
                    key={`admin-tournaments-page-${page}`}
                    href={`/admin/tournament?page=${page}`}
                    className={cn(
                      buttonVariants({ size: "sm", variant: page === currentPage ? "default" : "secondary" }),
                      "min-w-8 px-2",
                    )}
                  >
                    {page}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </section>
      </AnimatedPage>
    </MainLayout>
  );
}
