"use client";

import Link from "next/link";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type TournamentSummary = {
  id: number;
  title: string;
  status: "DRAFT" | "ACTIVE" | "FINISHED";
  startDate: string;
  participantsCount: number;
  teamLimit: number;
  matchBestOf: number;
  finalBestOf: number;
};

type TournamentLobbyProps = {
  tournaments: TournamentSummary[];
};

export function TournamentLobby({ tournaments }: TournamentLobbyProps) {
  return (
    <section className="mt-8 space-y-4">
      {tournaments.map((tournament) => (
        <Card key={tournament.id} className="border border-amber-500/30 bg-[#15171b]/75">
          <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
            <div>
              <CardTitle>{tournament.title}</CardTitle>
              <p className="mt-1 text-xs text-zinc-200/70">
                Start: {new Date(tournament.startDate).toLocaleString()}
              </p>
            </div>
            <Badge>{tournament.status}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-1 text-xs text-zinc-200/80 sm:grid-cols-3 sm:gap-4">
              <p>Teams: {tournament.participantsCount}/{tournament.teamLimit}</p>
              <p>Match: BO{tournament.matchBestOf}</p>
              <p>Final: BO{tournament.finalBestOf}</p>
            </div>
            <Link
              href={`/tournament/${tournament.id}`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Open tournament
            </Link>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

