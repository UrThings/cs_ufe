"use client";

import { RouteErrorBoundary } from "@/components/feedback/RouteErrorBoundary";

type AuthLoginErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AuthLoginError({ error, reset }: AuthLoginErrorProps) {
  return (
    <div className="py-8">
      <RouteErrorBoundary
        error={error}
        reset={reset}
        title="Login unavailable"
        description="We couldn’t load the login form. Refresh to try again."
      />
    </div>
  );
}
