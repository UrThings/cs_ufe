"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  href: string;
};

type HeaderNavLinksProps = {
  items: NavItem[];
  mobile?: boolean;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNavLinks({ items, mobile = false }: HeaderNavLinksProps) {
  const pathname = usePathname() ?? "/";

  if (mobile) {
    return (
      <>
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={`mobile-${item.href}`}
              href={item.href}
              className={cn("cs2-header-tab h-9 whitespace-nowrap rounded-[2px] px-3 py-0 text-xs", active && "cs2-header-tab-active")}
              aria-current={active ? "page" : undefined}
            >
              {item.title}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div className="cs2-header-nav">
      {items.map((item, index) => {
        const active = isActivePath(pathname, item.href);
        return (
          <div key={item.href} className="contents">
            {index > 0 ? <span className="cs2-header-sep" /> : null}
            <Link
              href={item.href}
              className={cn("cs2-header-tab", active && "cs2-header-tab-active")}
              aria-current={active ? "page" : undefined}
            >
              <span>{item.title}</span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
