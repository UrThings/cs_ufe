"use client";

import { RouteErrorBoundary } from "@/components/feedback/RouteErrorBoundary";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <div className="py-8">
      <RouteErrorBoundary
        error={error}
        reset={reset}
        title="Dashboard unavailable"
        description="Dashboard data could not be loaded."
      />
    </div>
  );
}
