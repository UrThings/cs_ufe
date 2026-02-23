import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { HeaderNavLinks } from "./HeaderNavLinks";
import {LogoutButton} from "./logoutButton"

export async function SiteHeader() {
  const user = await getCurrentUser();
  const navItems =
    user?.role === "ADMIN"
      ? [
          { title: "Admin Dashboard", href: "/admin/dashboard" },
          { title: "Admin Tournament", href: "/admin/tournament" },
        ]
      : [
          ...siteConfig.navMenu,
          ...(user ? [{ title: "Team", href: "/team" }] : []),
        ];

  const logoHref = user?.role === "ADMIN" ? "/admin/dashboard" : "/";

  return (
    <header className="sticky top-0 z-40">
      <div className="cs2-header-surface mx-auto flex h-[52px] w-full max-w-[110rem] items-center gap-2 px-2 sm:px-3">
        <Link
          href={logoHref}
          className="relative z-[1] flex shrink-0 items-center gap-2 px-2"
        >
          <div className="hidden leading-none md:block">
            <p className="text-[9px] uppercase tracking-[0.18em] text-blue-200/85">
              UFE CS2
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-100">
              {siteConfig.name}
            </p>
          </div>
        </Link>

        <nav className="hidden min-w-0 flex-1 justify-center lg:flex">
          <HeaderNavLinks items={navItems} />
        </nav>

        <div className="relative z-[1] flex shrink-0 items-center gap-2 px-1">
          <div className="hidden items-center gap-1 rounded-[2px] border border-blue-300/35 bg-blue-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-blue-100 md:flex">
            <ShieldCheck className="h-3 w-3" />
            CS2
          </div>
          {!user ? (
            <Link
              href="/auth/login"
              className="cs2-header-tab h-8 rounded-[2px] px-3 text-[11px]"
            >
              Login
            </Link>
          ) : (
             <LogoutButton /> 
          )}
        </div>
      </div>
      <div className="cs2-header-surface mx-auto flex w-full max-w-[110rem] gap-1 overflow-x-auto px-2 py-1.5 lg:hidden sm:px-3">
        <HeaderNavLinks items={navItems} mobile />
      </div>
    </header>
  );
}
