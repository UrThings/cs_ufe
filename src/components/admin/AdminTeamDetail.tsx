"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";

type AdminTeamDetailProps = {
  team: {
    id: number;
    name: string;
    slug: string;
    teamCode: string;
    description: string | null;
    isPaid: boolean;
    paidAt: string | null;
    createdAt: string;
    updatedAt: string;
    owner: {
      id: number;
      name: string | null;
      email: string;
    };
    members: Array<{
      id: number;
      role: string;
      joinedAt: string;
      userId: number;
      userName: string | null;
      userEmail: string;
    }>;
    hostedTournaments: Array<{
      id: number;
      title: string;
      status: string;
      startDate: string;
    }>;
    joinedTournaments: Array<{
      id: number;
      title: string;
      status: string;
      joinedAt: string;
    }>;
  };
};

export function AdminTeamDetail({ team }: AdminTeamDetailProps) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [isPaid, setIsPaid] = useState(team.isPaid);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tab, setTab] = useState<"overview" | "members" | "tournaments">("overview");

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          isPaid,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message ?? "Unable to update team.");
        return;
      }

      setMessage(result.message ?? "Team updated.");
      router.refresh();
    } catch {
      setMessage("Unable to reach the server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this team? Related matches, entries, requests, and hosted tournaments will be removed.",
    );
    if (!confirmed) {
      return;
    }

    setMessage(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/teams/${team.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message ?? "Unable to delete team.");
        return;
      }

      router.push("/admin/dashboard?view=teams");
      router.refresh();
    } catch {
      setMessage("Unable to reach the server.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <Card className="border border-amber-500/35 bg-[#15171b]/70">
        <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
          <div>
            <CardTitle>{team.name}</CardTitle>
            <p className="mt-1 text-xs text-zinc-200/70">
              Code: {team.teamCode} | Slug: {team.slug}
            </p>
          </div>
          <Badge className={team.isPaid ? "bg-emerald-500/20 text-emerald-100" : "bg-amber-500/20 text-amber-100"}>
            {team.isPaid ? "Paid" : "Pending"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant={tab === "overview" ? "default" : "ghost"} onClick={() => setTab("overview")}>
              Overview
            </Button>
            <Button variant={tab === "members" ? "default" : "ghost"} onClick={() => setTab("members")}>
              Members
            </Button>
            <Button variant={tab === "tournaments" ? "default" : "ghost"} onClick={() => setTab("tournaments")}>
              Tournaments
            </Button>
          </div>

          {message ? <p className="text-sm text-zinc-200/80">{message}</p> : null}

          {tab === "overview" ? (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSave}>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="team-name">Team name</Label>
                <Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="team-description">Description</Label>
                <Input
                  id="team-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Team note"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-200/80">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(event) => setIsPaid(event.target.checked)}
                  className="h-4 w-4 rounded border-amber-300/30 bg-zinc-900/50"
                />
                Payment approved
              </label>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save team"}
                </Button>
                <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
                  {isDeleting ? "Deleting..." : "Delete team"}
                </Button>
              </div>
              <p className="sm:col-span-2 text-xs text-zinc-200/70">
                Owner: {team.owner.name ?? team.owner.email} | Created:{" "}
                {new Date(team.createdAt).toLocaleString()} | Updated:{" "}
                {new Date(team.updatedAt).toLocaleString()}
              </p>
              <p className="sm:col-span-2 text-xs text-zinc-200/70">
                Paid at: {team.paidAt ? new Date(team.paidAt).toLocaleString() : "Not paid yet"}
              </p>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {tab === "members" ? (
        <Card className="border border-amber-500/35 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Team members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {team.members.length === 0 ? (
              <p className="text-sm text-zinc-200/75">No members.</p>
            ) : (
              team.members.map((member) => (
                <div key={member.id} className="rounded-xl border border-amber-500/25 bg-black/35 p-3">
                  <p className="text-sm text-zinc-100">
                    {member.userName ?? member.userEmail} ({member.role})
                  </p>
                  <p className="text-xs text-zinc-200/70">
                    {member.userEmail} | Joined: {new Date(member.joinedAt).toLocaleString()}
                  </p>
                  <Link
                    href={`/admin/dashboard/users/${member.userId}`}
                    className="mt-1 inline-block text-xs text-zinc-300 underline-offset-4 hover:underline"
                  >
                    Open user detail
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "tournaments" ? (
        <Card className="border border-amber-500/35 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Tournaments</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-300/70">Hosted</p>
              {team.hostedTournaments.length === 0 ? (
                <p className="text-sm text-zinc-200/75">No hosted tournaments.</p>
              ) : (
                team.hostedTournaments.map((tournament) => (
                  <div key={tournament.id} className="rounded-xl border border-amber-500/25 bg-black/35 p-3">
                    <p className="text-sm text-zinc-100">{tournament.title}</p>
                    <p className="text-xs text-zinc-200/70">
                      {tournament.status} | {new Date(tournament.startDate).toLocaleString()}
                    </p>
                    <Link
                      href={`/admin/tournament/${tournament.id}`}
                      className="mt-1 inline-block text-xs text-zinc-300 underline-offset-4 hover:underline"
                    >
                      Open tournament
                    </Link>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-300/70">Joined</p>
              {team.joinedTournaments.length === 0 ? (
                <p className="text-sm text-zinc-200/75">No joined tournaments.</p>
              ) : (
                team.joinedTournaments.map((tournament) => (
                  <div key={tournament.id} className="rounded-xl border border-amber-500/25 bg-black/35 p-3">
                    <p className="text-sm text-zinc-100">{tournament.title}</p>
                    <p className="text-xs text-zinc-200/70">
                      {tournament.status} | Joined {new Date(tournament.joinedAt).toLocaleString()}
                    </p>
                    <Link
                      href={`/admin/tournament/${tournament.id}`}
                      className="mt-1 inline-block text-xs text-zinc-300 underline-offset-4 hover:underline"
                    >
                      Open tournament
                    </Link>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

