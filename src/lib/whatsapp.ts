export function buildWhatsappUrl(
  telefono: string,
  texto: string,
): string {
  const phone = telefono.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`;
}

export interface WhatsappVars {
  nombre: string;
  telefono?: string;
  email?: string;
  direccion: string;
  referencias?: string;
  notas?: string;
  productos: string;
  subtotal: string;
  delivery: string;
  total: string;
  numero_orden: string;
}

export function renderPlantilla(plantilla: string, vars: WhatsappVars): string {
  return plantilla
    .replaceAll("{{nombre}}", vars.nombre || "")
    .replaceAll("{{telefono}}", vars.telefono || "")
    .replaceAll("{{email}}", vars.email || "")
    .replaceAll("{{direccion}}", vars.direccion || "")
    .replaceAll("{{referencias}}", vars.referencias || "")
    .replaceAll("{{notas}}", vars.notas || "")
    .replaceAll("{{productos}}", vars.productos || "")
    .replaceAll("{{subtotal}}", vars.subtotal || "")
    .replaceAll("{{delivery}}", vars.delivery || "0.00")
    .replaceAll("{{total}}", vars.total || "")
    .replaceAll("{{numero_orden}}", vars.numero_orden || "");
}
