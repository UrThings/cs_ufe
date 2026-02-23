import Link from "next/link";
import { siteConfig } from "@/constants/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-amber-300/20 py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-4 text-xs text-zinc-300 sm:flex-row sm:items-center sm:px-6">
        <p>© {year} {siteConfig.name}.</p>
        <div className="flex flex-wrap items-center gap-4">
          {siteConfig.navMenu.map((item) => (
            <Link
              key={`footer-${item.href}`}
              href={item.href}
              className="uppercase tracking-[0.08em] transition hover:text-amber-200"
            >
              {item.title}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
