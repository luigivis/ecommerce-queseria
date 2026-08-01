import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PerfilForm } from "@/components/backoffice/PerfilForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await requireAdmin();
  if (!session) redirect("/backoffice/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, nombre: true },
  });

  if (!user) redirect("/backoffice/login");

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-foreground/60">
          Cambiá tu nombre, email o contraseña.
        </p>
      </header>
      <PerfilForm user={user} />
    </div>
  );
}
