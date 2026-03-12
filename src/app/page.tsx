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
] as const;

export default async function HomePage() {
  const user = await getCurrentUser();
  const [leftTop, rightTop, middle] = highlights;

  return (
    <MainLayout>
      <AnimatedPage>
        <section className="">
          <div className="pointer-events-none absolute " />
          <div className="relative grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-full  bg-[#15171b]/74">
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <Badge className="w-fit">UFE INTERNAL COMPETITION PLATFORM</Badge>
                  <div className="space-y-3">
                    <h1 className="text-4xl font-semibold text-zinc-100 sm:text-5xl">
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
                </CardContent>
              </Card>

              <Card className="border-amber-300/25 bg-[#15171b]/74">
                <CardHeader className="pb-2">
                  <div className="mb-2 flex items-center justify-between">
                    <leftTop.icon className="h-5 w-5 text-amber-200" />
                    <Badge variant="default">LIVE</Badge>
                  </div>
                  <CardTitle className="text-base">{leftTop.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-300/90">{leftTop.description}</CardContent>
              </Card>

              <Card className="border-amber-300/25 bg-[#15171b]/74">
                <CardHeader className="pb-2">
                  <div className="mb-2 flex items-center justify-between">
                    <rightTop.icon className="h-5 w-5 text-amber-200" />
                    <Badge variant="default">LIVE</Badge>
                  </div>
                  <CardTitle className="text-base">{rightTop.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-300/90">{rightTop.description}</CardContent>
              </Card>

              <Card className="col-span-full border-amber-300/25 bg-[#15171b]/74">
                <CardHeader className="pb-2">
                  <div className="mb-2 flex items-center justify-between">
                    <middle.icon className="h-5 w-5 text-amber-200" />
                    <Badge variant="default">LIVE</Badge>
                  </div>
                  <CardTitle className="text-base">{middle.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-300/90">{middle.description}</CardContent>
              </Card>

              <Card className="col-span-full border-amber-300/30 bg-[#15171b]/74">
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
            </div>

           
                <div className="flex h-full min-h-[560px] items-start justify-center bg-gradient-to-b from-black/15 to-black/45 p-0 pt-4 sm:p-8 sm:pt-[24px] xl:-translate-y-6">
                  <Image
                    src="/cs_poster2.png"
                    alt="Tournament poster"
                    width={900}
                    height={1400}
                    className="h-auto max-h-[92vh] w-full rounded-md border border-[#3490E6]/80 object-contain shadow-[0_0_18px_rgba(52,144,230,0.85),0_0_48px_rgba(52,144,230,0.5)]"
                    priority
                  />
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
      </AnimatedPage>
    </MainLayout>
  );
}
