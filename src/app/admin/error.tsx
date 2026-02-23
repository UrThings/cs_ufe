"use client";

import { RouteErrorBoundary } from "@/components/feedback/RouteErrorBoundary";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
  return (
    <div className="py-8">
      <RouteErrorBoundary
        error={error}
        reset={reset}
        title="Admin console error"
        description="Admin operations could not be rendered."
      />
    </div>
  );
}
