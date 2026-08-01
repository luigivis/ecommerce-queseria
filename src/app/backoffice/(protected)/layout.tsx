import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/backoffice/LogoutButton";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingBag,
  Settings,
  MapPin,
  Truck,
  User,
} from "lucide-react";

export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.userId) redirect("/backoffice/login");

  const nav = [
    { href: "/backoffice", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/backoffice/ordenes", icon: ShoppingBag, label: "Órdenes" },
    { href: "/backoffice/productos", icon: Package, label: "Productos" },
    { href: "/backoffice/categorias", icon: Tags, label: "Categorías" },
    { href: "/backoffice/puntos-origen", icon: MapPin, label: "Puntos de origen" },
    { href: "/backoffice/delivery", icon: Truck, label: "Delivery" },
    { href: "/backoffice/configuracion", icon: Settings, label: "Configuración" },
    { href: "/backoffice/perfil", icon: User, label: "Mi perfil" },
  ];

  return (
    <div className="min-h-screen bg-muted flex">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-background">
        <div className="p-5 border-b border-border">
          <Link href="/backoffice" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary text-xl font-bold">
              Q
            </span>
            <span className="text-xl font-bold font-display">Quesería</span>
          </Link>
          <p className="mt-1 text-xs text-foreground/60">Backoffice</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Link href="/" className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
            ← Ver tienda
          </Link>
          <div className="px-3 py-2 text-xs text-foreground/60">{session.email}</div>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1 lg:hidden">
        <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-background px-4 py-3 overflow-x-auto">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs whitespace-nowrap"
            >
              <n.icon className="h-3.5 w-3.5" />
              {n.label}
            </Link>
          ))}
          <LogoutButton />
        </div>
        <div className="px-3 py-2 text-xs text-foreground/60 border-b border-border">
          {session.email}
        </div>
      </div>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
