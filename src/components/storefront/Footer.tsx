import Link from "next/link";

export function Footer({
  nombreSitio,
  telefono,
}: {
  nombreSitio: string;
  telefono: string;
}) {
  return (
    <footer className="mt-16 border-t border-border bg-muted">
      <div className="container-page py-10 grid gap-8 md:grid-cols-3">
        <div>
          <h3 className="text-2xl font-bold font-display">{nombreSitio}</h3>
          <p className="mt-2 text-sm text-foreground/70">
            Quesos artesanales hechos con tradición, entregados a tu puerta.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Navegación</h4>
          <ul className="space-y-1.5 text-sm">
            <li><Link href="/" className="hover:text-primary">Inicio</Link></li>
            <li><Link href="/productos" className="hover:text-primary">Productos</Link></li>
            <li><Link href="/productos?ofertas=1" className="hover:text-primary">Ofertas</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Contacto</h4>
          <ul className="space-y-1.5 text-sm text-foreground/80">
            <li>
              WhatsApp:{" "}
              <a
                href={`https://wa.me/${telefono.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                {telefono}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page py-4 text-center text-xs text-foreground/60">
          © {new Date().getFullYear()} {nombreSitio}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
