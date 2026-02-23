import Link from "next/link";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeading } from "@/components/layout/PageHeading";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type DashboardPageProps = {
  searchParams: Promise<{
    view?: string | string[];
    page?: string | string[];
  }>;
};

type DashboardView = "users" | "teams";

function resolveView(value: string | string[] | undefined): DashboardView {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "teams" ? "teams" : "users";
}

function resolvePage(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
}

export default async function AdminDashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const view = resolveView(params.view);
  const requestedPage = resolvePage(params.page);

  const [totalUsers, totalTeams, adminProfile] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  const activeTotal = view === "users" ? totalUsers : totalTeams;
  const totalPages = Math.max(1, Math.ceil(activeTotal / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const [users, teams] = await Promise.all([
    view === "users"
      ? prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          skip,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            teams: {
              select: {
                role: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                    isPaid: true,
                  },
                },
              },
            },
            _count: {
              select: {
                ownedTeams: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    view === "teams"
      ? prisma.team.findMany({
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          skip,
          select: {
            id: true,
            name: true,
            isPaid: true,
            createdAt: true,
            teamCode: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                members: true,
                tournaments: true,
                tournamentEntries: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Admin"
          title="Admin dashboard"
          description="Users and teams management views. Open detail pages to edit or delete safely."
          badge="Live"
        />

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="border border-amber-500/40 bg-[#15171b]/70">
            <CardContent>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-300/70">Users</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{totalUsers}</p>
            </CardContent>
          </Card>
          <Card className="border border-amber-500/40 bg-[#15171b]/70">
            <CardContent>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-300/70">Teams</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{totalTeams}</p>
            </CardContent>
          </Card>
          <Card className="border border-amber-500/40 bg-[#15171b]/70">
            <CardContent className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-300/70">Admin</p>
              <p className="text-sm text-zinc-100">{adminProfile?.name ?? adminProfile?.email}</p>
              <p className="text-xs text-zinc-200/75">{adminProfile?.email}</p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/admin/dashboard?view=users&page=1"
            className={cn(
              buttonVariants({ size: "sm", variant: view === "users" ? "default" : "secondary" }),
            )}
          >
            Users view
          </Link>
          <Link
            href="/admin/dashboard?view=teams&page=1"
            className={cn(
              buttonVariants({ size: "sm", variant: view === "teams" ? "default" : "secondary" }),
            )}
          >
            Teams view
          </Link>
          <Link href="/admin/tournament" className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
            Tournament operations
          </Link>
        </section>

        {view === "users" ? (
          <section className="mt-6 space-y-4">
            {users.length === 0 ? (
              <Card className="border border-amber-500/35 bg-[#15171b]/70">
                <CardContent>
                  <p className="text-sm text-zinc-200/75">No users found.</p>
                </CardContent>
              </Card>
            ) : (
              users.map((entry) => {
                const membership = entry.teams[0] ?? null;
                return (
                  <Card key={entry.id} className="border border-amber-500/35 bg-[#15171b]/70">
                    <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
                      <div>
                        <CardTitle className="text-base">{entry.name ?? entry.email}</CardTitle>
                        <p className="mt-1 text-xs text-zinc-200/75">{entry.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{entry.role}</Badge>
                        <Link
                          href={`/admin/dashboard/users/${entry.id}`}
                          className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
                        >
                          Open detail
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-xs text-zinc-200/80 sm:grid-cols-2">
                      <p>Owned teams: {entry._count.ownedTeams}</p>
                      <p>Registered: {new Date(entry.createdAt).toLocaleDateString()}</p>
                      <p className="sm:col-span-2">
                        Team: {membership ? `${membership.team.name} (${membership.role})` : "No team"}
                      </p>
                      <p className="sm:col-span-2">
                        Team payment: {membership ? (membership.team.isPaid ? "Paid" : "Pending") : "-"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
            {totalPages > 1 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from({ length: totalPages }).map((_, index) => {
                  const page = index + 1;
                  return (
                    <Link
                      key={`users-page-${page}`}
                      href={`/admin/dashboard?view=users&page=${page}`}
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
        ) : null}

        {view === "teams" ? (
          <section className="mt-6 space-y-4">
            {teams.length === 0 ? (
              <Card className="border border-amber-500/35 bg-[#15171b]/70">
                <CardContent>
                  <p className="text-sm text-zinc-200/75">No teams found.</p>
                </CardContent>
              </Card>
            ) : (
              teams.map((team) => (
                <Card key={team.id} className="border border-amber-500/35 bg-[#15171b]/70">
                  <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
                    <div>
                      <CardTitle className="text-base">{team.name}</CardTitle>
                      <p className="mt-1 text-xs text-zinc-200/75">
                        Owner: {team.owner.name ?? team.owner.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={team.isPaid ? "bg-emerald-500/20 text-emerald-100" : ""}>
                        {team.isPaid ? "Paid" : "Pending"}
                      </Badge>
                      <Link
                        href={`/admin/dashboard/teams/${team.id}`}
                        className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
                      >
                        Open detail
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-xs text-zinc-200/80 sm:grid-cols-2">
                    <p>Members: {team._count.members}</p>
                    <p>Hosted tournaments: {team._count.tournaments}</p>
                    <p>Joined tournaments: {team._count.tournamentEntries}</p>
                    <p>Code: {team.teamCode}</p>
                    <p className="sm:col-span-2">Created: {new Date(team.createdAt).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              ))
            )}
            {totalPages > 1 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from({ length: totalPages }).map((_, index) => {
                  const page = index + 1;
                  return (
                    <Link
                      key={`teams-page-${page}`}
                      href={`/admin/dashboard?view=teams&page=${page}`}
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
        ) : null}
      </AnimatedPage>
    </MainLayout>
  );
}

