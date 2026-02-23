import { Badge } from "@/components/ui";

type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
};

export function PageHeading({
  eyebrow,
  title,
  description,
  badge,
}: PageHeadingProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-300">{eyebrow}</p>
        {badge ? <Badge variant="default">{badge}</Badge> : null}
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold text-zinc-100 sm:text-5xl">{title}</h1>
        <p className="max-w-3xl text-sm text-zinc-300/90 sm:text-base">{description}</p>
      </div>
    </div>
  );
}
