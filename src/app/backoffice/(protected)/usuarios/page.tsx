import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsuariosClient } from "@/components/backoffice/UsuariosClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const session = await requireAdmin();
  if (!session) redirect("/backoffice/login");

  if (session.role !== "ADMIN") {
    redirect("/backoffice");
  }

  const usuarios = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      nombre: true,
      role: true,
      activo: true,
      createdAt: true,
    },
  });

  const data = usuarios.map((u) => ({
    ...u,
    role: u.role as "ADMIN" | "OPERADOR" | "VENDEDOR",
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 sm:p-8">
      <UsuariosClient usuarios={data} currentUserId={session.userId!} />
    </div>
  );
}