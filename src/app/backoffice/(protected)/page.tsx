import Link from "next/link";
import { prisma } from "@/lib/db";
import { ShoppingBag, Package, CheckCircle2, Clock } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { getConfiguracion } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const cfg = await getConfiguracion();
  const [hoy, pendientes, confirmadas, recientes] = await Promise.all([
    prisma.orden.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.orden.count({ where: { estado: "PENDIENTE" } }),
    prisma.orden.count({ where: { estado: "CONFIRMADA" } }),
    prisma.orden.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const stats = [
    { label: "Órdenes hoy", value: hoy, icon: ShoppingBag, color: "bg-primary/10 text-primary" },
    { label: "Pendientes", value: pendientes, icon: Clock, color: "bg-yellow-100 text-yellow-700" },
    { label: "Confirmadas", value: confirmadas, icon: CheckCircle2, color: "bg-green-100 text-green-700" },
    { label: "Stock bajo", value: 0, icon: Package, color: "bg-red-100 text-red-700" },
  ];

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-3xl font-bold font-display mb-1">Dashboard</h1>
      <p className="text-foreground/60 text-sm mb-8">Resumen de {cfg.nombreSitio}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-foreground/60">{s.label}</p>
                <p className="mt-1 text-2xl sm:text-3xl font-bold">{s.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Órdenes recientes</h2>
          <Link href="/backoffice/ordenes" className="text-sm text-primary hover:underline">
            Ver todas →
          </Link>
        </div>
        {recientes.length === 0 ? (
          <p className="text-sm text-foreground/60">Aún no hay órdenes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-foreground/60 border-b border-border">
                <tr>
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recientes.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-2 pr-4 font-medium">
                      <Link href={`/backoffice/ordenes?focus=${o.id}`} className="hover:text-primary">
                        #{o.numero}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{o.tipo}</td>
                    <td className="py-2 pr-4">
                      <EstadoBadge estado={o.estado} />
                    </td>
                    <td className="py-2 pr-4 font-semibold">{formatPrice(o.total, cfg.moneda)}</td>
                    <td className="py-2 pr-4 text-foreground/60">
                      {new Date(o.createdAt).toLocaleString("es-NI", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-800",
    CONFIRMADA: "bg-blue-100 text-blue-800",
    EN_PREPARACION: "bg-purple-100 text-purple-800",
    ENTREGADA: "bg-green-100 text-green-800",
    CANCELADA: "bg-gray-200 text-gray-700",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[estado] || ""}`}>
      {estado.replace("_", " ")}
    </span>
  );
}
