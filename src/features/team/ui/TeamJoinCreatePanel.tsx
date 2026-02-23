"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";

type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

function resolveApiError(payload: ApiErrorPayload, fallback: string) {
  const fieldErrors = payload.errors ? Object.values(payload.errors).flat().filter(Boolean) : [];
  if (fieldErrors.length > 0) {
    return fieldErrors[0];
  }
  return payload.message ?? fallback;
}

export function TeamJoinCreatePanel() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<"join" | "create">("join");
  const [joinCode, setJoinCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message ?? "Unable to join team.");
        return;
      }

      setMessage(result.message ?? "Joined team successfully.");
      router.refresh();
    } catch {
      setMessage("Unable to reach the server. Try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const trimmedName = teamName.trim();
    if (trimmedName.length < 2) {
      setMessage("Team name must be at least 2 characters.");
      return;
    }
    if (trimmedName.length > 80) {
      setMessage("Team name must be 80 characters or fewer.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
        }),
      });
      const result = (await response.json()) as ApiErrorPayload;

      if (!response.ok) {
        setMessage(resolveApiError(result, "Unable to create team."));
        return;
      }

      setMessage(result.message ?? "Team created successfully.");
      router.refresh();
    } catch {
      setMessage("Unable to reach the server. Try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-card neon-border border-amber-500/40 bg-[#15171b]/70">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className="border border-amber-500/40 bg-amber-500/10 text-[0.6rem] uppercase tracking-[0.35em] text-zinc-200">
            No Team
          </Badge>
          <CardTitle className="text-xl text-zinc-100">Team Setup</CardTitle>
        </div>
        <p className="text-sm text-zinc-200/75">
          You are not in a team yet. Join with a team code or create your own team.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant={activeMode === "join" ? "default" : "ghost"} onClick={() => setActiveMode("join")}>
            Join team
          </Button>
          <Button
            type="button"
            variant={activeMode === "create" ? "default" : "ghost"}
            onClick={() => setActiveMode("create")}
          >
            Create team
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeMode === "join" ? (
          <form className="space-y-3" onSubmit={handleJoin}>
            <div className="space-y-2">
              <Label htmlFor="joinCode">Team code</Label>
              <Input
                id="joinCode"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="ABC123"
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Joining..." : "Join with code"}
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="teamName">Team name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="UFE Eagles"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamDescription">Description</Label>
              <textarea
                id="teamDescription"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-amber-500/20 bg-zinc-950/55 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
                placeholder="Short team description"
              />
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create team"}
            </Button>
          </form>
        )}

        {message ? <p className="text-sm text-zinc-200/80">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
