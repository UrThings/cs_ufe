import { type ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-esports text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 bg-black/58" />
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-30" />
      <div className="pointer-events-none absolute inset-0 cs2-scanlines opacity-35" />
      <div className="pointer-events-none absolute left-[8%] top-[6%] h-64 w-64 rounded-full bg-[var(--cs2-blue-soft)] blur-[76px]" />
      <div className="pointer-events-none absolute bottom-[10%] right-[8%] h-72 w-72 rounded-full bg-[var(--cs2-orange-soft)] blur-[92px]" />
      <div className="pointer-events-none absolute right-[34%] top-[12%] h-56 w-56 rounded-full bg-[var(--cs2-amber-soft)] blur-[72px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.48)_75%)]" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 md:py-10">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
