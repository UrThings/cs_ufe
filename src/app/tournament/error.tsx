"use client";

import { RouteErrorBoundary } from "@/components/feedback/RouteErrorBoundary";

type TournamentErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function TournamentError({ error, reset }: TournamentErrorProps) {
  return (
    <div className="py-8">
      <RouteErrorBoundary
        error={error}
        reset={reset}
        title="Tournament error"
        description="Tournament bracket data could not be rendered."
      />
    </div>
  );
}
