"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";

type AdminUserDetailProps = {
  user: {
    id: number;
    name: string | null;
    email: string;
    role: "MEMBER" | "ADMIN";
    createdAt: string;
    updatedAt: string;
    membership: {
      teamId: number;
      teamName: string;
      teamSlug: string;
      teamRole: string;
      joinedAt: string;
      isPaid: boolean;
      memberCount: number;
    } | null;
    ownedTeams: Array<{
      id: number;
      name: string;
      isPaid: boolean;
      memberCount: number;
      tournamentCount: number;
      createdAt: string;
    }>;
  };
};

export function AdminUserDetail({ user }: AdminUserDetailProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<"MEMBER" | "ADMIN">(user.role);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message ?? "Unable to update user.");
        return;
      }

      setMessage(result.message ?? "User updated.");
      router.refresh();
    } catch {
      setMessage("Unable to reach the server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this user? Owned teams and related tournament data will also be removed.",
    );
    if (!confirmed) {
      return;
    }

    setMessage(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message ?? "Unable to delete user.");
        return;
      }

      router.push("/admin/dashboard?view=users");
      router.refresh();
    } catch {
      setMessage("Unable to reach the server.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-8 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="border border-amber-500/35 bg-[#15171b]/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Edit user profile</CardTitle>
            <Badge>{role}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSave}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="admin-user-name">Name</Label>
              <Input
                id="admin-user-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="admin-user-email">Email</Label>
              <Input
                id="admin-user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="admin-user-role">Role</Label>
              <select
                id="admin-user-role"
                value={role}
                onChange={(event) => setRole(event.target.value as "MEMBER" | "ADMIN")}
                className="h-11 w-full rounded-xl border border-amber-300/25 bg-zinc-950/55 px-3 text-sm text-zinc-100"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? "Deleting..." : "Delete user"}
              </Button>
            </div>
          </form>
          {message ? <p className="mt-3 text-sm text-zinc-200/80">{message}</p> : null}
          <p className="mt-2 text-xs text-zinc-200/70">
            Created: {new Date(user.createdAt).toLocaleString()} | Updated:{" "}
            {new Date(user.updatedAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border border-amber-500/35 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Current team membership</CardTitle>
          </CardHeader>
          <CardContent>
            {!user.membership ? (
              <p className="text-sm text-zinc-200/75">User is not in any team.</p>
            ) : (
              <div className="space-y-2 rounded-xl border border-amber-500/25 bg-black/35 p-3">
                <p className="text-sm text-zinc-100">{user.membership.teamName}</p>
                <p className="text-xs text-zinc-200/75">
                  Role: {user.membership.teamRole} | Members: {user.membership.memberCount}
                </p>
                <p className="text-xs text-zinc-200/75">
                  Joined: {new Date(user.membership.joinedAt).toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      user.membership.isPaid
                        ? "bg-emerald-500/20 text-emerald-100"
                        : "bg-amber-500/20 text-amber-100"
                    }
                  >
                    {user.membership.isPaid ? "Paid" : "Pending"}
                  </Badge>
                  <Link
                    href={`/admin/dashboard/teams/${user.membership.teamId}`}
                    className="text-xs text-zinc-300 underline-offset-4 hover:underline"
                  >
                    Open team detail
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-amber-500/35 bg-[#15171b]/70">
          <CardHeader>
            <CardTitle>Owned teams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {user.ownedTeams.length === 0 ? (
              <p className="text-sm text-zinc-200/75">No owned teams.</p>
            ) : (
              user.ownedTeams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-xl border border-amber-500/25 bg-black/35 p-3 text-sm text-zinc-200/85"
                >
                  <p className="text-zinc-100">{team.name}</p>
                  <p className="text-xs text-zinc-200/70">
                    Members: {team.memberCount} | Hosted tournaments: {team.tournamentCount}
                  </p>
                  <Link
                    href={`/admin/dashboard/teams/${team.id}`}
                    className="mt-1 inline-block text-xs text-zinc-300 underline-offset-4 hover:underline"
                  >
                    Open team detail
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

