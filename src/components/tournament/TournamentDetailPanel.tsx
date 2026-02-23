"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TournamentBracket, type BracketRound } from "@/components/tournament/TournamentBracket";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

type TeamSummary = {
  id: number;
  name: string;
  description: string | null;
  members: Array<{
    id: number;
    name: string | null;
    email: string;
    role: string;
  }>;
};

type MatchSummary = {
  id: number;
  round: number;
  position: number;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELED";
  winnerTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  scheduledAt: string;
  completedAt: string | null;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string } | null;
};

type TournamentDetailPanelProps = {
  tournament: {
    id: number;
    title: string;
    status: "DRAFT" | "ACTIVE" | "FINISHED";
    startDate: string;
    headliner: string | null;
    participantsCount: number;
    teamLimit: number;
    matchBestOf: number;
    finalBestOf: number;
    teams: TeamSummary[];
    matches: MatchSummary[];
  };
  viewer: {
    loggedIn: boolean;
    teamId: number | null;
    teamName: string | null;
    teamRole: "CAPTAIN" | "MEMBER" | "ADMIN" | null;
    isJoined: boolean;
    requestStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  };
};

const HISTORY_INITIAL_PAGE_SIZE = 6;
const MATCH_PAGE_SIZE_STEP = 6;

function getMatchStatusTone(status: MatchSummary["status"]) {
  if (status === "LIVE") {
    return "border-amber-300/40 bg-amber-400/10 text-amber-100";
  }

  if (status === "COMPLETED") {
    return "border-emerald-300/40 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "CANCELED") {
    return "border-red-300/40 bg-red-400/10 text-red-100";
  }

  return "border-amber-300/35 bg-amber-500/10 text-zinc-200";
}

function buildRoundName(round: number, maxRound: number) {
  if (round === maxRound) {
    return "Final";
  }
  if (round === maxRound - 1) {
    return "Semifinal";
  }
  if (round === maxRound - 2) {
    return "Quarterfinal";
  }
  return `Round ${round}`;
}

function toRounds(matches: MatchSummary[]): BracketRound[] {
  if (matches.length === 0) {
    return [];
  }

  const map = new Map<number, BracketRound>();
  const maxRound = Math.max(...matches.map((m) => m.round), 1);

  matches.forEach((match) => {
    if (!map.has(match.round)) {
      map.set(match.round, {
        id: `round-${match.round}`,
        name: buildRoundName(match.round, maxRound),
        matches: [],
      });
    }

    map.get(match.round)!.matches.push({
      id: `match-${match.id}`,
      status: match.status === "COMPLETED" ? "COMPLETED" : match.status === "LIVE" ? "LIVE" : "SCHEDULED",
      winnerTeamId: match.winnerTeamId ?? undefined,
      homeTeam: {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        score: match.homeScore,
      },
      awayTeam: match.awayTeam
        ? {
            id: match.awayTeam.id,
            name: match.awayTeam.name,
            score: match.awayScore,
          }
        : null,
    });
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);
}

export function TournamentDetailPanel({ tournament, viewer }: TournamentDetailPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "teams" | "history" | "bracket">("overview");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(HISTORY_INITIAL_PAGE_SIZE);
  const rounds = useMemo(() => toRounds(tournament.matches), [tournament.matches]);
  const historyMatches = useMemo(
    () =>
      tournament.matches
        .filter((match) => match.status === "COMPLETED")
        .sort((a, b) => {
          const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return bTime - aTime;
        }),
    [tournament.matches],
  );
  const totalHistoryPages = Math.max(1, Math.ceil(historyMatches.length / historyPageSize));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const pagedHistoryMatches = historyMatches.slice(
    (safeHistoryPage - 1) * historyPageSize,
    safeHistoryPage * historyPageSize,
  );

  const canRequest =
    viewer.loggedIn &&
    viewer.teamId !== null &&
    viewer.teamRole === "CAPTAIN" &&
    !viewer.isJoined &&
    viewer.requestStatus !== "PENDING" &&
    viewer.requestStatus !== "APPROVED" &&
    tournament.status === "DRAFT";

  const handleJoinRequest = async () => {
    if (!viewer.teamId) {
      return;
    }

    setMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: viewer.teamId }),
      });
      const result = await response.json();
      setMessage(result.message ?? (response.ok ? "Request sent." : "Request failed."));
      if (response.ok) {
        router.refresh();
      }
    } catch {
      setMessage("Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <Card className="border border-amber-500/35 bg-[#15171b]/70">
        <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
          <div>
            <CardTitle>{tournament.title}</CardTitle>
            <p className="mt-1 text-xs text-zinc-200/70">
              Start: {new Date(tournament.startDate).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-zinc-200/70">
              Teams {tournament.participantsCount}/{tournament.teamLimit} | BO{tournament.matchBestOf} | Final BO
              {tournament.finalBestOf}
            </p>
            {tournament.headliner ? (
              <p className="mt-1 text-xs text-zinc-200/70">Headliner: {tournament.headliner}</p>
            ) : null}
          </div>
          <Badge>{tournament.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant={activeTab === "overview" ? "default" : "ghost"} onClick={() => setActiveTab("overview")}>
              Overview
            </Button>
            <Button variant={activeTab === "teams" ? "default" : "ghost"} onClick={() => setActiveTab("teams")}>
              Teams
            </Button>
            <Button variant={activeTab === "history" ? "default" : "ghost"} onClick={() => setActiveTab("history")}>
              Match history
            </Button>
            <Button variant={activeTab === "bracket" ? "default" : "ghost"} onClick={() => setActiveTab("bracket")}>
              Bracket
            </Button>
          </div>

          {activeTab === "overview" ? (
            <div className="rounded-xl border border-amber-500/20 bg-black/30 p-3 text-sm text-zinc-200/85">
              {viewer.isJoined ? (
                <p className="text-emerald-200">Your team is approved for this tournament.</p>
              ) : viewer.requestStatus === "PENDING" ? (
                <p className="text-amber-200">Join request is pending admin approval.</p>
              ) : viewer.requestStatus === "APPROVED" ? (
                <p className="text-emerald-200">Admin approved your team.</p>
              ) : !viewer.loggedIn ? (
                <p>Login required to send a join request.</p>
              ) : viewer.teamId === null ? (
                <p>Create or join a team first.</p>
              ) : viewer.teamRole !== "CAPTAIN" ? (
                <p>Only captain can send join requests.</p>
              ) : tournament.status !== "DRAFT" ? (
                <p>Join requests are closed for this tournament.</p>
              ) : (
                <Button onClick={handleJoinRequest} disabled={!canRequest || isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send join request"}
                </Button>
              )}

              {viewer.teamName ? <p className="mt-2 text-xs text-zinc-200/70">Your team: {viewer.teamName}</p> : null}
              {message ? <p className="mt-2 text-xs text-zinc-200/80">{message}</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {activeTab === "teams" ? (
        <Card className="border border-amber-500/35 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Approved teams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tournament.teams.length === 0 ? (
              <p className="text-sm text-zinc-200/75">No approved teams yet.</p>
            ) : (
              tournament.teams.map((team) => (
                <details key={team.id} className="rounded-lg border border-amber-500/20 bg-black/30 p-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-100">{team.name}</summary>
                  <p className="mt-2 text-xs text-zinc-200/70">{team.description ?? "No team description"}</p>
                  <div className="mt-2 space-y-1">
                    {team.members.map((member) => (
                      <p key={member.id} className="text-xs text-zinc-200/70">
                        {member.name ?? member.email} ({member.role})
                      </p>
                    ))}
                  </div>
                </details>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "history" ? (
        <Card className="border border-amber-500/35 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Match history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {historyMatches.length === 0 ? (
              <p className="text-sm text-zinc-200/75">No completed matches yet.</p>
            ) : (
              <>
                <div className="grid gap-3">
                  {pagedHistoryMatches.map((match) => (
                    <div
                      key={match.id}
                      className="group rounded-lg border border-amber-500/20 bg-black/30 p-3 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-amber-950/35"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.24em] text-zinc-300/75">
                          Round {match.round} - Match {match.position}
                        </p>
                        <Badge className={getMatchStatusTone(match.status)}>{match.status}</Badge>
                      </div>
                      <p className="mt-2 text-[15px] font-semibold text-zinc-100">
                        {match.homeTeam.name} {match.homeScore ?? "-"} : {match.awayScore ?? "-"}{" "}
                        {match.awayTeam?.name ?? "BYE"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-200/70">
                        Completed: {match.completedAt ? new Date(match.completedAt).toLocaleString() : "-"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalHistoryPages }).map((_, index) => {
                      const page = index + 1;
                      return (
                        <Button
                          key={`history-page-${page}`}
                          variant={safeHistoryPage === page ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setHistoryPage(page)}
                          className="h-8 min-w-8 px-2"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  {historyMatches.length > historyPageSize ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setHistoryPageSize((prev) => prev + MATCH_PAGE_SIZE_STEP)}
                    >
                      See more
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "bracket" ? (
        <Card className="border border-amber-500/35 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Bracket</CardTitle>
          </CardHeader>
          <CardContent>
            {rounds.length > 0 ? (
              <TournamentBracket rounds={rounds} />
            ) : (
              <p className="text-sm text-zinc-200/75">Bracket not generated yet.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

