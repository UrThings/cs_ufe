"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="cs2-header-tab h-8 rounded-[2px] px-3 text-[11px]"
    >
      Logout
    </button>
  );
}