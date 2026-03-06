import Image from "next/image";
import Link from "next/link";
import { Activity, Crosshair, ShieldCheck, Users } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { cn } from "@/lib/utils";

const highlights = [
  {
    title: "Captain-Centric Entry",
    description: "Only captain can send tournament request, keeping roster control clean.",
    icon: ShieldCheck,
  },
  {
    title: "Auto Bracket Engine",
    description: "Admin seeds teams and bracket tree is generated instantly.",
    icon: Crosshair,
  },
  {
    title: "Live Result Flow",
    description: "Winner updates are reflected through next rounds in real-time.",
    icon: Activity,
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <MainLayout>
      <AnimatedPage>
        <section className="glass-card neon-border relative overflow-hidden rounded-xl border border-amber-300/35 p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-300/12 via-transparent to-orange-400/8" />
          <div className="relative grid items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <Badge className="w-fit">UFE INTERNAL COMPETITION PLATFORM</Badge>
              <div className="space-y-3">
                <h1 className="text-5xl font-semibold text-zinc-100 sm:text-6xl">
                  UFE CS2 Tactical Arena
                </h1>
                <p className="max-w-2xl text-base text-zinc-300/90">
                  Build a student team, apply through captain access, and follow every bracket match with esports-style visibility.
                </p>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">
                  {user ? `Logged in: ${user.name ?? user.email}` : "Sign in to create or join a team"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={user ? "/team" : "/auth/login"}
                  className={cn(buttonVariants({ size: "lg" }), "min-w-[11rem] justify-center")}
                >
                  {user ? "Open Team" : "Login / Register"}
                </Link>
                <Link
                  href="/tournament"
                  className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
                >Tournaments
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-amber-300/30 bg-black/40">
              <Image
                src="/home_bg.jpg"
                alt="CS2 visual"
                width={1200}
                height={720}
                className="h-[260px] w-full object-cover opacity-85 sm:h-[320px]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-300">Campus Match Command</p>
                <p className="mt-1 text-sm font-semibold text-zinc-100">
                  UFE league control, bracket clarity, and competitive workflow.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* 
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-amber-300/35 bg-[#1a1b20]/70">
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold text-zinc-100">{metrics.teams}</p>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-300">Teams</p>
            </CardContent>
          </Card>
          <Card className="border-amber-300/35 bg-[#1a1b20]/70">
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold text-zinc-100">{metrics.tournaments}</p>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-300">Tournaments</p>
            </CardContent>
          </Card>
          <Card className="border-amber-300/35 bg-[#1a1b20]/70">
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold text-zinc-100">{metrics.matches}</p>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-300">Matches</p>
            </CardContent>
          </Card>
          <Card className="border-amber-300/35 bg-[#1a1b20]/70">
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold text-zinc-100">{metrics.paidTeams}</p>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-300">Paid Teams</p>
            </CardContent>
          </Card>
        </section> */}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <Card key={item.title} className="border-amber-300/25 bg-[#15171b]/74">
              <CardHeader className="pb-2">
                <div className="mb-2 flex items-center justify-between">
                  <item.icon className="h-5 w-5 text-amber-200" />
                  <Badge variant="default">LIVE</Badge>
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-300/90">{item.description}</CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr]">
          <Card className="border-amber-300/30 bg-[#15171b]/74">
            <CardHeader className="flex items-center gap-2 sm:flex-row">
              <Users className="h-5 w-5 text-amber-200" />
              <CardTitle>Three-step flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-300">
              <div className="rounded-md border border-amber-300/20 bg-zinc-950/45 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Step 01</p>
                Register and create a team with your student account.
              </div>
              <div className="rounded-md border border-amber-300/20 bg-zinc-950/45 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Step 02</p>
                Captain sends tournament request for the team.
              </div>
              <div className="rounded-md border border-amber-300/20 bg-zinc-950/45 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Step 03</p>
                Admin approves and bracket starts with live progression.
              </div>
            </CardContent>
          </Card>

          {/* <Card className="hidden overflow-hidden border-amber-300/30 bg-[#15171b]/74 lg:block">
            <CardContent className="p-0">
              <div className="flex h-full min-h-[360px] items-center justify-center p-4">
                <Image
                  src="/poster.png"
                  alt="Tournament poster"
                  width={550}
                  height={}
                  className="h-auto w-auto max-w-full object-contain opacity-90"
                />
              </div>
            </CardContent>
          </Card> */}
        </section>
      </AnimatedPage>
    </MainLayout>
  );
}
