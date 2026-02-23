import Link from "next/link";
import { Badge } from "@/components/ui";

export function TeamCodeHint() {
  return (
    <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-zinc-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-300">Team invite</p>
          <p className="text-base font-semibold text-zinc-100">Already have a team code?</p>
        </div>
        <Badge variant="danger">Alpha Pass</Badge>
      </div>
      <p className="mt-2 text-sm text-zinc-200/80">
        Once you log in, enter the code inside the Team workspace to join instantly or ask the
        captain to regenerate the token.
      </p>
      <Link
        href="/team"
        className="mt-3 inline-flex items-center justify-center rounded-full border border-amber-400/60 bg-amber-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-100 transition hover:bg-amber-500/70"
      >
        Go to Team Workspace
      </Link>
    </div>
  );
}

