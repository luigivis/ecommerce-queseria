import Link from "next/link";
import { prisma } from "@/lib/db";
import { CheckCircle2, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ConfirmacionPage({
  params,
}: {
  params: { ordenId: string };
}) {
  const orden = await prisma.orden.findUnique({ where: { id: params.ordenId } });
  return (
    <div className="container-page py-16 max-w-2xl text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
      <h1 className="mt-6 text-5xl font-bold font-display">
        {orden?.tipo === "COTIZAR" ? "Cotización enviada" : "Pedido enviado"}
      </h1>
      <p className="mt-3 text-foreground/70">
        {orden
          ? `Tu número de orden es #${orden.numero}. Nuestro equipo te contactará por WhatsApp para confirmar.`
          : "Tu orden fue registrada."}
      </p>
      <div className="card p-6 mt-8 text-left">
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          ¿Qué sigue?
        </h2>
        <ol className="text-sm text-foreground/70 space-y-2 list-decimal list-inside">
          <li>Revisá tu WhatsApp — abrimos la conversación con el detalle de tu pedido.</li>
          <li>Te confirmaremos disponibilidad y forma de pago.</li>
          <li>Coordinaremos la entrega a tu domicilio.</li>
        </ol>
      </div>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/productos" className="btn-primary">
          Seguir comprando
        </Link>
        <Link href="/" className="btn-secondary">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
