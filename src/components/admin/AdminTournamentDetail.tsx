"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, useToast } from "@/components/ui";
import { TournamentBracket, type BracketRound } from "@/components/tournament/TournamentBracket";

type TeamInfo = {
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

type RequestInfo = {
  id: number;
  teamId: number;
  teamName: string;
  captainName: string | null;
  captainEmail: string;
  requestedAt: string;
};

type MatchInfo = {
  id: number;
  round: number;
  position: number;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELED";
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string } | null;
  winnerTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  scheduledAt: string;
  completedAt: string | null;
};

type AdminTournamentDetailProps = {
  tournament: {
    id: number;
    title: string;
    format: "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN";
    status: "DRAFT" | "ACTIVE" | "FINISHED";
    startDate: string;
    endDate: string | null;
    headliner: string | null;
    teamLimit: number;
    matchBestOf: number;
    finalBestOf: number;
    teams: TeamInfo[];
    pendingRequests: RequestInfo[];
    matches: MatchInfo[];
  };
};

type ScoreState = Record<
  number,
  {
    winnerTeamId: number;
    homeScore: string;
    awayScore: string;
  }
>;

const MATCH_PAGE_SIZE_STEP = 6;
const HISTORY_INITIAL_PAGE_SIZE = 6;
const CONTROL_INITIAL_PAGE_SIZE = 6;

function getMatchStatusTone(status: MatchInfo["status"]) {
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

function toRounds(matches: MatchInfo[]): BracketRound[] {
  if (matches.length === 0) {
    return [];
  }

  const roundMap = new Map<number, BracketRound>();
  const maxRound = Math.max(...matches.map((match) => match.round), 1);
  const roundName = (round: number) => {
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
  };

  matches.forEach((match) => {
    if (!roundMap.has(match.round)) {
      roundMap.set(match.round, {
        id: `round-${match.round}`,
        name: roundName(match.round),
        matches: [],
      });
    }

    roundMap.get(match.round)!.matches.push({
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

  return Array.from(roundMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);
}

export function AdminTournamentDetail({ tournament }: AdminTournamentDetailProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [tab, setTab] = useState<"overview" | "teams" | "requests" | "history" | "bracket" | "edit">("overview");
  const [message, setMessage] = useState<string | null>(null);
  const [scoreState, setScoreState] = useState<ScoreState>({});
  const [editTitle, setEditTitle] = useState(tournament.title);
  const [editStartDate, setEditStartDate] = useState(tournament.startDate.slice(0, 16));
  const [editEndDate, setEditEndDate] = useState(
    tournament.endDate ? tournament.endDate.slice(0, 16) : "",
  );
  const [editHeadliner, setEditHeadliner] = useState(tournament.headliner ?? "");
  const [editTeamLimit, setEditTeamLimit] = useState(tournament.teamLimit);
  const [editMatchBestOf, setEditMatchBestOf] = useState<1 | 3>(tournament.matchBestOf === 3 ? 3 : 1);
  const [editFinalBestOf, setEditFinalBestOf] = useState<1 | 3 | 5>(
    tournament.finalBestOf === 5 ? 5 : tournament.finalBestOf === 3 ? 3 : 1,
  );
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(HISTORY_INITIAL_PAGE_SIZE);
  const [controlPage, setControlPage] = useState(1);
  const [controlPageSize, setControlPageSize] = useState(CONTROL_INITIAL_PAGE_SIZE);
  const [removingTeamId, setRemovingTeamId] = useState<number | null>(null);
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
  const controlMatches = useMemo(
    () =>
      [...tournament.matches].sort((a, b) => {
        if (a.round !== b.round) {
          return b.round - a.round;
        }
        return b.position - a.position;
      }),
    [tournament.matches],
  );
  const totalHistoryPages = Math.max(1, Math.ceil(historyMatches.length / historyPageSize));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const pagedHistoryMatches = historyMatches.slice(
    (safeHistoryPage - 1) * historyPageSize,
    safeHistoryPage * historyPageSize,
  );
  const totalControlPages = Math.max(1, Math.ceil(controlMatches.length / controlPageSize));
  const safeControlPage = Math.min(controlPage, totalControlPages);
  const pagedControlMatches = controlMatches.slice(
    (safeControlPage - 1) * controlPageSize,
    safeControlPage * controlPageSize,
  );

  const approveRequest = async (requestId: number) => {
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/tournaments/${tournament.id}/requests/${requestId}/approve`,
        { method: "POST" },
      );
      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.message ?? "Unable to approve request.";
        setMessage(errorMessage);
        notify({ message: errorMessage, variant: "error" });
        return;
      }

      const successMessage = result.message ?? "Approved.";
      setMessage(successMessage);
      notify({ message: successMessage, variant: "success" });
      router.refresh();
    } catch {
      const errorMessage = "Unable to reach the server.";
      setMessage(errorMessage);
      notify({ message: errorMessage, variant: "error" });
    }
  };

  const startTournament = async () => {
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/tournaments/${tournament.id}/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shuffle: true }),
      });
      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.message ?? "Unable to start tournament.";
        setMessage(errorMessage);
        notify({ message: errorMessage, variant: "error" });
        return;
      }

      const successMessage = result.message ?? "Tournament started.";
      setMessage(successMessage);
      notify({ message: successMessage, variant: "success" });
      router.refresh();
    } catch {
      const errorMessage = "Unable to reach the server.";
      setMessage(errorMessage);
      notify({ message: errorMessage, variant: "error" });
    }
  };

  const saveWinner = async (match: MatchInfo) => {
    const current = scoreState[match.id];
    if (!current) {
      const errorMessage = "Winner and score values are required.";
      setMessage(errorMessage);
      notify({ message: errorMessage, variant: "error" });
      return;
    }

    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/tournaments/${tournament.id}/matches/${match.id}/winner`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            winnerTeamId: current.winnerTeamId,
            homeScore: Number(current.homeScore),
            awayScore: Number(current.awayScore),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.message ?? "Unable to save match result.";
        setMessage(errorMessage);
        notify({ message: errorMessage, variant: "error" });
        return;
      }

      const successMessage = result.message ?? "Match updated.";
      setMessage(successMessage);
      notify({ message: successMessage, variant: "success" });
      router.refresh();
    } catch {
      const errorMessage = "Unable to reach the server.";
      setMessage(errorMessage);
      notify({ message: errorMessage, variant: "error" });
    }
  };

  const handleEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          startDate: new Date(editStartDate).toISOString(),
          endDate: editEndDate ? new Date(editEndDate).toISOString() : null,
          headliner: editHeadliner.trim() || null,
          teamLimit: editTeamLimit,
          matchBestOf: editMatchBestOf,
          finalBestOf: editFinalBestOf,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.message ?? "Unable to update tournament.";
        setMessage(errorMessage);
        notify({ message: errorMessage, variant: "error" });
        return;
      }

      const successMessage = result.message ?? "Tournament updated.";
      setMessage(successMessage);
      notify({ message: successMessage, variant: "success" });
      router.refresh();
    } catch {
      const errorMessage = "Unable to reach the server.";
      setMessage(errorMessage);
      notify({ message: errorMessage, variant: "error" });
    }
  };

  const removeTeamFromTournament = async (team: TeamInfo) => {
    const confirmed = window.confirm(
      `Remove "${team.name}" from this tournament? This is allowed only before bracket seeding.`,
    );
    if (!confirmed) {
      return;
    }

    setMessage(null);
    setRemovingTeamId(team.id);
    try {
      const response = await fetch(`/api/admin/tournaments/${tournament.id}/teams/${team.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.message ?? "Unable to remove team from tournament.";
        setMessage(errorMessage);
        notify({ message: errorMessage, variant: "error" });
        return;
      }

      const successMessage = result.message ?? "Team removed from tournament.";
      setMessage(successMessage);
      notify({ message: successMessage, variant: "success" });
      router.refresh();
    } catch {
      const errorMessage = "Unable to reach the server.";
      setMessage(errorMessage);
      notify({ message: errorMessage, variant: "error" });
    } finally {
      setRemovingTeamId(null);
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
              {tournament.format.replaceAll("_", " ")} | Teams limit {tournament.teamLimit} | BO{tournament.matchBestOf} | Final BO{tournament.finalBestOf}
            </p>
          </div>
          <Badge>{tournament.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant={tab === "overview" ? "default" : "ghost"} onClick={() => setTab("overview")}>
              Overview
            </Button>
            <Button variant={tab === "teams" ? "default" : "ghost"} onClick={() => setTab("teams")}>
              Teams
            </Button>
            <Button variant={tab === "requests" ? "default" : "ghost"} onClick={() => setTab("requests")}>
              Requests
            </Button>
            <Button variant={tab === "history" ? "default" : "ghost"} onClick={() => setTab("history")}>
              History
            </Button>
            <Button variant={tab === "bracket" ? "default" : "ghost"} onClick={() => setTab("bracket")}>
              Bracket
            </Button>
            <Button variant={tab === "edit" ? "default" : "ghost"} onClick={() => setTab("edit")}>
              Edit
            </Button>
          </div>

          {message ? <p className="text-sm text-zinc-200/80">{message}</p> : null}

          {tab === "overview" ? (
            <div className="space-y-3">
              {tournament.status === "DRAFT" && tournament.format !== "SINGLE_ELIMINATION" ? (
                <p className="text-sm text-zinc-200/75">
                  This tournament is {tournament.format.replaceAll("_", " ")}. Current start engine supports only SINGLE ELIMINATION.
                </p>
              ) : null}
              {tournament.status === "DRAFT" && tournament.format === "SINGLE_ELIMINATION" ? (
                <Button onClick={startTournament}>Start (Random Seed)</Button>
              ) : null}
              {tournament.status !== "DRAFT" ? (
                <p className="text-sm text-zinc-200/75">
                  Tournament already started. You can continue updating results/history.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {tab === "teams" ? (
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
                  <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-100">
                    {team.name}
                  </summary>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={removingTeamId === team.id || tournament.status !== "DRAFT"}
                    onClick={() => removeTeamFromTournament(team)}
                    className="mt-2"
                  >
                    {removingTeamId === team.id
                      ? "Removing..."
                      : tournament.status !== "DRAFT"
                        ? "Locked after seed"
                        : "Remove team"}
                  </Button>
                  <p className="mt-1 text-xs text-zinc-200/70">{team.description ?? "No team description"}</p>
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

      {tab === "requests" ? (
        <Card className="border border-amber-500/35 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Pending requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tournament.pendingRequests.length === 0 ? (
              <p className="text-sm text-zinc-200/75">No pending requests.</p>
            ) : (
              tournament.pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm text-zinc-100">{request.teamName}</p>
                    <p className="text-xs text-zinc-200/75">
                      Captain: {request.captainName ?? request.captainEmail} |{" "}
                      {new Date(request.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => approveRequest(request.id)}>
                    Approve
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "history" ? (
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

      {tab === "bracket" ? (
        <Card className="border border-amber-500/35 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Bracket + result control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rounds.length > 0 ? (
              <TournamentBracket rounds={rounds} />
            ) : (
              <p className="text-sm text-zinc-200/75">Bracket not generated yet.</p>
            )}

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-300/75">Match control feed</p>
              {pagedControlMatches.map((match) => (
                <div
                  key={match.id}
                  className="rounded-lg border border-amber-500/20 bg-black/25 p-3 space-y-2 transition-all duration-200 hover:border-amber-300/40 hover:bg-amber-950/35"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-zinc-100">
                      Round {match.round} - Match {match.position}
                    </p>
                    <Badge className={getMatchStatusTone(match.status)}>{match.status}</Badge>
                  </div>
                  <p className="text-xs text-zinc-200/75">
                    {match.homeTeam.name} vs {match.awayTeam?.name ?? "BYE"}
                  </p>
                  {match.status !== "COMPLETED" && match.awayTeam ? (
                    <div className="grid gap-2 sm:grid-cols-4">
                      <select
                        value={scoreState[match.id]?.winnerTeamId ?? ""}
                        onChange={(event) =>
                          setScoreState((prev) => ({
                            ...prev,
                            [match.id]: {
                              winnerTeamId: Number(event.target.value),
                              homeScore: prev[match.id]?.homeScore ?? "",
                              awayScore: prev[match.id]?.awayScore ?? "",
                            },
                          }))
                        }
                        className="h-10 rounded-lg border border-amber-300/25 bg-amber-950/35 px-2 text-sm text-zinc-100"
                      >
                        <option value="">Winner</option>
                        <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
                        <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
                      </select>
                      <Input
                        type="number"
                        min={0}
                        max={9}
                        placeholder="Home"
                        value={scoreState[match.id]?.homeScore ?? ""}
                        onChange={(event) =>
                          setScoreState((prev) => ({
                            ...prev,
                            [match.id]: {
                              winnerTeamId: prev[match.id]?.winnerTeamId ?? 0,
                              homeScore: event.target.value,
                              awayScore: prev[match.id]?.awayScore ?? "",
                            },
                          }))
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        max={9}
                        placeholder="Away"
                        value={scoreState[match.id]?.awayScore ?? ""}
                        onChange={(event) =>
                          setScoreState((prev) => ({
                            ...prev,
                            [match.id]: {
                              winnerTeamId: prev[match.id]?.winnerTeamId ?? 0,
                              homeScore: prev[match.id]?.homeScore ?? "",
                              awayScore: event.target.value,
                            },
                          }))
                        }
                      />
                      <Button
                        variant="secondary"
                        onClick={() => saveWinner(match)}
                        disabled={!scoreState[match.id]?.winnerTeamId}
                      >
                        Save result
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-200/75">
                      Winner:{" "}
                      {match.winnerTeamId === match.homeTeam.id
                        ? match.homeTeam.name
                        : match.awayTeam?.name ?? "TBD"}
                      {match.homeScore !== null && match.awayScore !== null
                        ? ` (${match.homeScore}:${match.awayScore})`
                        : ""}
                    </p>
                  )}
                </div>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalControlPages }).map((_, index) => {
                    const page = index + 1;
                    return (
                      <Button
                        key={`control-page-${page}`}
                        variant={safeControlPage === page ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setControlPage(page)}
                        className="h-8 min-w-8 px-2"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                {controlMatches.length > controlPageSize ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setControlPageSize((prev) => prev + MATCH_PAGE_SIZE_STEP)}
                  >
                    See more
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "edit" ? (
        <Card className="border border-amber-500/35 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Edit tournament</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleEdit}>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editTitle">Title</Label>
                <Input id="editTitle" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editStartDate">Start date</Label>
                <Input
                  id="editStartDate"
                  type="datetime-local"
                  value={editStartDate}
                  onChange={(event) => setEditStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editHeadliner">Headliner</Label>
                <Input
                  id="editHeadliner"
                  value={editHeadliner}
                  onChange={(event) => setEditHeadliner(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEndDate">End date</Label>
                <Input
                  id="editEndDate"
                  type="datetime-local"
                  value={editEndDate}
                  onChange={(event) => setEditEndDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTeamLimit">Team limit</Label>
                <Input
                  id="editTeamLimit"
                  type="number"
                  min={2}
                  max={64}
                  value={editTeamLimit}
                  onChange={(event) => setEditTeamLimit(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMatchBestOf">Match format</Label>
                <select
                  id="editMatchBestOf"
                  value={editMatchBestOf}
                  onChange={(event) => setEditMatchBestOf(Number(event.target.value) as 1 | 3)}
                  className="h-11 w-full rounded-xl border border-amber-300/25 bg-zinc-950/55 px-3 text-sm text-zinc-100"
                >
                  <option value={1}>BO1</option>
                  <option value={3}>BO3</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editFinalBestOf">Final format</Label>
                <select
                  id="editFinalBestOf"
                  value={editFinalBestOf}
                  onChange={(event) => setEditFinalBestOf(Number(event.target.value) as 1 | 3 | 5)}
                  className="h-11 w-full rounded-xl border border-amber-300/25 bg-zinc-950/55 px-3 text-sm text-zinc-100"
                >
                  <option value={1}>BO1</option>
                  <option value={3}>BO3</option>
                  <option value={5}>BO5</option>
                </select>
              </div>
              <Button type="submit" className="sm:col-span-2">
                Save tournament settings
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

