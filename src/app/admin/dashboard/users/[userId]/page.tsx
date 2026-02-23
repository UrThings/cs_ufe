import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminUserDetail } from "@/components/admin/AdminUserDetail";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeading } from "@/components/layout/PageHeading";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { buttonVariants } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function AdminUserDetailPage({ params }: RouteContext) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const { userId: userIdParam } = await params;
  const userId = Number(userIdParam);
  if (!Number.isInteger(userId) || userId <= 0) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      teams: {
        select: {
          role: true,
          joinedAt: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              isPaid: true,
              _count: {
                select: { members: true },
              },
            },
          },
        },
      },
      ownedTeams: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          isPaid: true,
          createdAt: true,
          _count: {
            select: {
              members: true,
              tournaments: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const membership = user.teams[0]
    ? {
        teamId: user.teams[0].team.id,
        teamName: user.teams[0].team.name,
        teamSlug: user.teams[0].team.slug,
        teamRole: user.teams[0].role,
        joinedAt: user.teams[0].joinedAt.toISOString(),
        isPaid: user.teams[0].team.isPaid,
        memberCount: user.teams[0].team._count.members,
      }
    : null;

  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Admin User"
          title={user.name ?? user.email}
          description="User profile, role, and team ownership relations."
          badge={user.role}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/dashboard?view=users" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Back to users
          </Link>
          {membership ? (
            <Link
              href={`/admin/dashboard/teams/${membership.teamId}`}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Open current team
            </Link>
          ) : null}
        </div>
        <AdminUserDetail
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            membership,
            ownedTeams: user.ownedTeams.map((team) => ({
              id: team.id,
              name: team.name,
              isPaid: team.isPaid,
              memberCount: team._count.members,
              tournamentCount: team._count.tournaments,
              createdAt: team.createdAt.toISOString(),
            })),
          }}
        />
      </AnimatedPage>
    </MainLayout>
  );
}
