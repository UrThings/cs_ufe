import { type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui";

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
};

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card className="neon-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-300/80">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
            <p className="mt-1 text-xs text-zinc-200/65">{hint}</p>
          </div>
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/12 p-2 text-zinc-300">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
