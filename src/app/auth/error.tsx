"use client";

import { RouteErrorBoundary } from "@/components/feedback/RouteErrorBoundary";

type AuthErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AuthError({ error, reset }: AuthErrorProps) {
  return (
    <div className="py-8">
      <RouteErrorBoundary
        error={error}
        reset={reset}
        title="Authentication error"
        description="Unable to complete sign-in flow."
      />
    </div>
  );
}
