"use client";

import { RouteErrorBoundary } from "@/components/feedback/RouteErrorBoundary";

type AuthRegisterErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AuthRegisterError({ error, reset }: AuthRegisterErrorProps) {
  return (
    <div className="py-8">
      <RouteErrorBoundary
        error={error}
        reset={reset}
        title="Registration unavailable"
        description="We couldn’t load the registration form. Refresh to try again."
      />
    </div>
  );
}
