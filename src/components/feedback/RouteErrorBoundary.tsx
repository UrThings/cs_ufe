"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

type RouteErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
};

export function RouteErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred while loading this page.",
}: RouteErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-amber-300/25 bg-amber-500/10 p-6 text-zinc-200">
      <div className="mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-zinc-300/90">
        <AlertTriangle className="h-4 w-4" />
        Error boundary
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-zinc-200/85">{description}</p>
      {error.digest ? (
        <p className="mt-2 text-xs text-zinc-300/75">Reference: {error.digest}</p>
      ) : null}
      <Button className="mt-5" onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}

