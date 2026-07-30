"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/backoffice/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted"
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </button>
  );
}
