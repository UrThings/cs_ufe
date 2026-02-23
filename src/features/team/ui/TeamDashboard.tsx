"use client";

import { FormEvent, useMemo, useState } from "react";
import { RefreshCw, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";
import type { TeamWithMembers } from "@/features/team/services/team.service";
import { cn } from "@/lib/utils";

type TeamDashboardProps = {
  team: TeamWithMembers;
  currentUserId: number;
};

const MATCH_PAGE_SIZE_STEP = 6;
const MATCH_INITIAL_PAGE_SIZE = 6;

function getMatchStatusTone(status: string) {
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

export function TeamDashboard({ team, currentUserId }: TeamDashboardProps) {
  const router = useRouter();
  const [teamState, setTeamState] = useState(team);
  const [teamName, setTeamName] = useState(team.name);
  const [teamDescription, setTeamDescription] = useState(team.description ?? "");
  const [regenMessage, setRegenMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [kickMessage, setKickMessage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);
  const [kickingMemberId, setKickingMemberId] = useState<number | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [matchPage, setMatchPage] = useState(1);
  const [matchPageSize, setMatchPageSize] = useState(MATCH_INITIAL_PAGE_SIZE);

  const canManageTeam = teamState.viewerRole === "CAPTAIN" || teamState.viewerRole === "ADMIN";

  const paymentStatus = teamState.isPaid ? "Paid" : "Pending";
  const paymentClass = teamState.isPaid
    ? "bg-emerald-500/10 text-emerald-200"
    : "bg-amber-500/10 text-zinc-200";

  const currentMember = useMemo(
    () => teamState.members.find((member) => member.userId === currentUserId),
    [currentUserId, teamState.members],
  );
  const totalMatchPages = Math.max(1, Math.ceil(teamState.matches.length / matchPageSize));
  const safeMatchPage = Math.min(matchPage, totalMatchPages);
  const pagedMatches = teamState.matches.slice(
    (safeMatchPage - 1) * matchPageSize,
    safeMatchPage * matchPageSize,
  );

  const handleRegenerate = async () => {
    if (!canManageTeam) {
      return;
    }

    setIsRegenerating(true);
    setRegenMessage(null);

    try {
      const response = await fetch(`/api/teams/${teamState.id}/code/regenerate`, {
        method: "POST",
      });

      const payload = await response.json();

      if (!response.ok) {
        setRegenMessage(payload.message ?? "Unable to regenerate code.");
        return;
      }

      setTeamState((current) => ({
        ...current,
        teamCode: payload.data?.team?.teamCode ?? payload.team.teamCode,
      }));
      setRegenMessage("Team code rotated successfully.");
    } catch {
      setRegenMessage("Unable to reach the server. Try again later.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleUpdateTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInfoMessage(null);

    if (!canManageTeam) {
      return;
    }

    setIsUpdatingTeam(true);

    const trimmedName = teamName.trim();
    const trimmedDescription = teamDescription.trim();
    const requestPayload: Partial<{ name: string; description: string | null }> = {};

    if (trimmedName && trimmedName !== teamState.name) {
      requestPayload.name = trimmedName;
    }

    const currentDescription = teamState.description ?? "";
    if (trimmedDescription !== currentDescription) {
      requestPayload.description = trimmedDescription === "" ? null : trimmedDescription;
    }

    if (Object.keys(requestPayload).length === 0) {
      setInfoMessage("No changes detected.");
      setIsUpdatingTeam(false);
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamState.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        setInfoMessage(result.message ?? "Unable to update team.");
        return;
      }

      const updatedTeam = result.data?.team ?? result.team;
      setTeamState((prev) => ({ ...prev, ...updatedTeam }));
      setTeamName(updatedTeam.name);
      setTeamDescription(updatedTeam.description ?? "");
      setInfoMessage(result.message ?? "Team updated successfully.");
    } catch {
      setInfoMessage("Unable to reach the server. Try again shortly.");
    } finally {
      setIsUpdatingTeam(false);
    }
  };

  const handleKick = async (memberUserId: number) => {
    if (!canManageTeam || memberUserId === currentUserId) {
      return;
    }

    setKickingMemberId(memberUserId);
    setKickMessage(null);

    try {
      const response = await fetch(`/api/teams/${teamState.id}/members/${memberUserId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        setKickMessage(result.message ?? "Unable to remove member.");
        return;
      }

      setTeamState((prev) => ({
        ...prev,
        members: prev.members.filter((member) => member.userId !== memberUserId),
      }));
      setKickMessage(result.message ?? "Member removed.");
    } catch {
      setKickMessage("Unable to reach the server. Try again shortly.");
    } finally {
      setKickingMemberId(null);
    }
  };

  const handleLeaveTeam = async () => {
    setKickMessage(null);
    setIsLeaving(true);

    try {
      const response = await fetch("/api/teams/me", {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        setKickMessage(result.message ?? "Unable to leave team.");
        return;
      }

      router.refresh();
    } catch {
      setKickMessage("Unable to reach the server. Try again shortly.");
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="glass-card border-amber-500/40 bg-[#15171b]/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-300/70">Team</p>
              <p className="text-2xl font-semibold text-zinc-100">{teamState.name}</p>
              <p className="text-xs text-zinc-200/70 mt-1">
                Таны эрх: {currentMember?.role ?? teamState.viewerRole}
              </p>
            </div>
            <Badge
              className={cn(
                "rounded-full border border-amber-500/40 px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em]",
                paymentClass,
              )}
            >
              {paymentStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-200/80">
            {teamState.description || "No team description added yet."}
          </p>

          <div className="rounded-2xl border border-amber-500/30 bg-black/40 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-200">
              <span>Invite code</span>
              <Badge className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em]">
                ID {teamState.slug}
              </Badge>
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">
              {canManageTeam ? teamState.teamCode : "Admin only"}
            </p>
            {canManageTeam ? (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  disabled={isRegenerating}
                  onClick={handleRegenerate}
                  className="text-zinc-200"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRegenerating ? "Rotating..." : "Regenerate code"}
                </Button>
                <Badge className="rounded-full border border-amber-500/30 bg-amber-500/30 px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em] text-zinc-100">
                  {teamState.members.length} members
                </Badge>
              </div>
            ) : (
              <p className="mt-3 text-xs text-zinc-200/70">
                Invite code-ийг зөвхөн багийн admin харж, шинэчилнэ.
              </p>
            )}
            {regenMessage ? <p className="mt-2 text-sm text-zinc-300/80">{regenMessage}</p> : null}
          </div>

          {canManageTeam ? (
            <div className="rounded-2xl border border-amber-500/30 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-300/70">Team identity</p>
              <form className="mt-3 space-y-3" onSubmit={handleUpdateTeam}>
                <div>
                  <Label htmlFor="teamName" className="text-xs uppercase tracking-[0.3em] text-zinc-200/70">
                    Team name
                  </Label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    className="mt-1 bg-zinc-950/55 text-zinc-100"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="teamDescription"
                    className="text-xs uppercase tracking-[0.3em] text-zinc-200/70"
                  >
                    Description
                  </Label>
                  <textarea
                    id="teamDescription"
                    rows={3}
                    value={teamDescription}
                    onChange={(event) => setTeamDescription(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-500/20 bg-zinc-950/55 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <Button variant="secondary" className="w-full max-w-[200px]" disabled={isUpdatingTeam} type="submit">
                  {isUpdatingTeam ? "Saving..." : "Update team details"}
                </Button>
                {infoMessage ? <p className="text-xs text-zinc-200/80">{infoMessage}</p> : null}
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/10 p-3 text-xs text-zinc-200/80">
              Та энгийн гишүүн эрхтэй тул team update, code rotate хийх боломжгүй.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border border-amber-500/40 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Member roster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!canManageTeam ? (
              <Button variant="outline" className="w-full" onClick={handleLeaveTeam} disabled={isLeaving}>
                {isLeaving ? "Leaving..." : "Leave team"}
              </Button>
            ) : null}
            {teamState.members.map((member) => (
              <div
                key={member.memberId}
                className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-black/40 px-4 py-3 text-sm text-zinc-200"
              >
                <div>
                  <p className="font-semibold text-zinc-100">{member.user.name || member.user.email}</p>
                  <p className="text-xs text-zinc-200/70">{member.role}</p>
                </div>
                {canManageTeam && member.userId !== currentUserId ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleKick(member.userId)}
                    disabled={kickingMemberId === member.userId}
                    className="text-[12px] font-bold"
                  >
                    {kickingMemberId === member.userId ? "Removing..." : "Kick"}
                  </Button>
                ) : (
                  <Badge className="text-[0.6rem] uppercase tracking-[0.3em] text-zinc-100">joined</Badge>
                )}
              </div>
            ))}
            {kickMessage ? <p className="text-xs text-zinc-200/80">{kickMessage}</p> : null}
          </CardContent>
        </Card>

        <Card className="border border-amber-500/40 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Match schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamState.matches.length === 0 ? (
              <p className="text-sm text-zinc-200/75">No scheduled matches yet for this team.</p>
            ) : (
              <>
                <div className="grid gap-3">
                  {pagedMatches.map((match) => (
                    <div
                      key={match.id}
                      className="group rounded-xl border border-amber-500/25 bg-black/35 p-3 text-sm text-zinc-200/88 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300/45 hover:bg-amber-950/45"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.28em] text-zinc-300/75">
                          {match.tournament.title} | Round {match.round}
                        </p>
                        <Badge className={getMatchStatusTone(match.status)}>{match.status}</Badge>
                      </div>
                      <p className="mt-2 text-[15px] font-semibold text-zinc-100 transition-colors group-hover:text-amber-100">
                        Opponent: {match.opponent?.name ?? "BYE"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-200/72">
                        Scheduled: {new Date(match.scheduledAt).toLocaleString()}
                      </p>
                      {match.homeScore !== null && match.awayScore !== null ? (
                        <p className="mt-1 text-xs font-semibold text-amber-100">
                          Score: {match.homeScore}:{match.awayScore}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalMatchPages }).map((_, index) => {
                      const page = index + 1;
                      return (
                        <Button
                          key={page}
                          variant={safeMatchPage === page ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setMatchPage(page)}
                          className="h-8 min-w-8 px-2"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  {teamState.matches.length > matchPageSize ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setMatchPageSize((prev) => prev + MATCH_PAGE_SIZE_STEP)}
                    >
                      See more
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
