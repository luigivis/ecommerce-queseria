import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-6xl font-bold font-display">404</h1>
      <p className="mt-3 text-foreground/70">No encontramos esa página.</p>
      <Link href="/" className="btn-primary mt-6">Volver al inicio</Link>
    </div>
  );
}
