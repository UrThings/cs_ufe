"use client";

import { RouteErrorBoundary } from "@/components/feedback/RouteErrorBoundary";

type TeamErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function TeamError({ error, reset }: TeamErrorProps) {
  return (
    <div className="py-8">
      <RouteErrorBoundary
        error={error}
        reset={reset}
        title="Team page error"
        description="Team information could not be loaded."
      />
    </div>
  );
}
