import { cn } from "@/lib/utils";

type PageSkeletonProps = {
  title?: string;
  className?: string;
};

export function PageSkeleton({ title = "Loading", className }: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-live="polite" aria-busy="true">
      <div className="space-y-3">
        <div className="h-3 w-36 animate-pulse rounded bg-amber-300/10" />
        <div className="h-10 w-3/5 animate-pulse rounded bg-amber-300/12" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-amber-300/10" />
      </div>

      <div className="rounded-2xl border border-amber-300/20 bg-zinc-900/45 p-5">
        <p className="mb-4 text-sm text-zinc-300">{title}...</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-card-${index}`}
              className="h-24 animate-pulse rounded-xl border border-amber-300/20 bg-zinc-900/50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
