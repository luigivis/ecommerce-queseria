import { prisma } from "@/lib/db";
import { LoginForm } from "@/components/backoffice/LoginForm";
import { SetupForm } from "@/components/backoffice/SetupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acceso", robots: { index: false, follow: false } };

export default async function LoginPage() {
  const needsSetup = (await prisma.user.count()) === 0;
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-bold font-display text-center mb-2">
          {needsSetup ? "Crear cuenta" : "Backoffice"}
        </h1>
        <p className="text-center text-sm text-foreground/60 mb-8">
          {needsSetup
            ? "Bienvenido. Creá la primera cuenta de administrador para empezar."
            : "Inicia sesión para administrar la tienda"}
        </p>
        {needsSetup ? <SetupForm /> : <LoginForm />}
      </div>
    </div>
  );
}
