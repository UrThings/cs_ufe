"use client";

import { RouteErrorBoundary } from "@/components/feedback/RouteErrorBoundary";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-esports px-4">
      <RouteErrorBoundary
        error={error}
        reset={reset}
        title="Application error"
        description="The app hit an unexpected state. Retry the request."
      />
    </div>
  );
}
