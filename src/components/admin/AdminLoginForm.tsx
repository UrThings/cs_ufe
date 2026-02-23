"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";

type MeResponse = {
  data?: {
    user?: {
      role?: "MEMBER" | "ADMIN";
    };
  };
  message?: string;
};

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "forbidden" ? "Admin эрх шаардлагатай." : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginResult = await loginResponse.json();

      if (!loginResponse.ok) {
        setError(loginResult.message ?? "Login failed.");
        return;
      }

      const meResponse = await fetch("/api/auth/me");
      const meResult = (await meResponse.json()) as MeResponse;
      const role = meResult.data?.user?.role;

      if (role !== "ADMIN") {
        await fetch("/api/auth/logout", { method: "POST" });
        setError("Таны аккаунт admin эрхгүй байна.");
        return;
      }

      const redirectPath = searchParams.get("redirect");
      router.push(
        redirectPath && redirectPath.startsWith("/admin/")
          ? redirectPath
          : "/admin/dashboard",
      );
      router.refresh();
    } catch {
      setError("Unable to reach the server. Try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto mt-8 w-full max-w-md border border-amber-500/40 bg-[#15171b]/70">
      <CardHeader>
        <CardTitle>Admin Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? <p className="text-sm text-amber-200">{error}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Admin sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

