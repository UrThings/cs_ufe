"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";

type AdminTournamentManagerProps = {
  initialTournamentEnabled: boolean;
};

export function AdminTournamentManager({ initialTournamentEnabled }: AdminTournamentManagerProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [teamLimit, setTeamLimit] = useState(16);
  const [matchBestOf, setMatchBestOf] = useState<1 | 3>(1);
  const [finalBestOf, setFinalBestOf] = useState<1 | 3 | 5>(3);
  const [message, setMessage] = useState<string | null>(null);
  const [controlMessage, setControlMessage] = useState<string | null>(null);
  const [tournamentEnabled, setTournamentEnabled] = useState(initialTournamentEnabled);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingControl, setIsSavingControl] = useState(false);

  const createTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startDate: new Date(startDate).toISOString(),
          teamLimit,
          matchBestOf,
          finalBestOf,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message ?? "Unable to create tournament.");
        return;
      }

      setMessage(result.message ?? "Tournament created.");
      setTitle("");
      setStartDate("");
      setTeamLimit(16);
      setMatchBestOf(1);
      setFinalBestOf(3);
      router.refresh();
    } catch {
      setMessage("Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveTournamentControl = async () => {
    setControlMessage(null);
    setIsSavingControl(true);

    try {
      const response = await fetch("/api/admin/tournament-control", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: tournamentEnabled }),
      });
      const result = await response.json();

      if (!response.ok) {
        setControlMessage(result.message ?? "Unable to update tournament access control.");
        return;
      }

      setControlMessage(result.message ?? "Tournament access control updated.");
      router.refresh();
    } catch {
      setControlMessage("Unable to reach the server.");
    } finally {
      setIsSavingControl(false);
    }
  };

  return (
    <Card className="mt-8 border border-amber-500/40 bg-[#15171b]/70">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Create tournament</CardTitle>
          <Badge className="bg-amber-500/20 text-zinc-200">No host required</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-3 rounded-xl border border-amber-500/30 bg-black/25 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Tournament page access</p>
              <p className="text-xs text-zinc-200/75">
                Enabled: users see the header Tournament button and can open `/tournament`.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-200/85">
              <input
                type="checkbox"
                checked={tournamentEnabled}
                onChange={(event) => setTournamentEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-amber-300/30 bg-zinc-900/50"
              />
              Enabled
            </label>
          </div>
          <Button type="button" onClick={saveTournamentControl} disabled={isSavingControl}>
            {isSavingControl ? "Saving..." : "Save access setting"}
          </Button>
          {controlMessage ? <p className="text-sm text-zinc-200/80">{controlMessage}</p> : null}
        </section>

        <form className="grid gap-3 sm:grid-cols-2" onSubmit={createTournament}>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Tournament title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="UFE CS2 Spring Cup"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start date</Label>
            <Input
              id="startDate"
              type="datetime-local"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamLimit">Team limit</Label>
            <Input
              id="teamLimit"
              type="number"
              min={2}
              max={64}
              value={teamLimit}
              onChange={(event) => setTeamLimit(Number(event.target.value))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="matchBestOf">Normal match format</Label>
            <select
              id="matchBestOf"
              value={matchBestOf}
              onChange={(event) => setMatchBestOf(Number(event.target.value) as 1 | 3)}
              className="h-11 w-full rounded-xl border border-amber-300/25 bg-zinc-950/55 px-3 text-sm text-zinc-100"
            >
              <option value={1}>BO1</option>
              <option value={3}>BO3</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="finalBestOf">Final format</Label>
            <select
              id="finalBestOf"
              value={finalBestOf}
              onChange={(event) => setFinalBestOf(Number(event.target.value) as 1 | 3 | 5)}
              className="h-11 w-full rounded-xl border border-amber-300/25 bg-zinc-950/55 px-3 text-sm text-zinc-100"
            >
              <option value={1}>BO1</option>
              <option value={3}>BO3</option>
              <option value={5}>BO5</option>
            </select>
          </div>
          <Button type="submit" disabled={isSubmitting} className="sm:col-span-2">
            {isSubmitting ? "Creating..." : "Create tournament"}
          </Button>
        </form>
        {message ? <p className="mt-3 text-sm text-zinc-200/80">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

