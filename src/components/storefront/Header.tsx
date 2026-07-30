import Link from "next/link";
import { ShoppingCart, Search } from "lucide-react";
import { CartButton } from "./CartButton";

export function Header({
  nombreSitio,
  logoUrl,
}: {
  nombreSitio: string;
  logoUrl: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground hover:opacity-80"
          aria-label={`Inicio - ${nombreSitio}`}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={nombreSitio}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary text-xl font-bold">
              Q
            </span>
          )}
          <span className="text-2xl font-bold font-display tracking-tight">
            {nombreSitio}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-primary transition-colors">
            Inicio
          </Link>
          <Link href="/productos" className="hover:text-primary transition-colors">
            Productos
          </Link>
          <Link href="/productos?ofertas=1" className="hover:text-primary transition-colors">
            Ofertas
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/productos"
            className="btn-ghost p-2.5"
            aria-label="Buscar productos"
          >
            <Search className="h-5 w-5" />
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
