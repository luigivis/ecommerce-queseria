const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface RangoDelivery {
  id: string;
  desdeKm: number;
  hastaKm: number;
  costo: number;
  orden: number;
}

export interface CalculoDelivery {
  disponible: boolean;
  costo?: number;
  distanciaKm?: number;
  puntoOrigenId?: string;
  puntoOrigenNombre?: string;
  mensaje?: string;
}

export function calcularCostoDelivery(
  distanciaKm: number,
  rangos: RangoDelivery[],
): { disponible: boolean; costo?: number; mensaje?: string } {
  if (rangos.length === 0) {
    return { disponible: false, mensaje: "No hay rangos de envío configurados." };
  }
  const ordenados = [...rangos].sort((a, b) => a.orden - b.orden || a.desdeKm - b.desdeKm);
  for (const r of ordenados) {
    if (distanciaKm >= r.desdeKm && distanciaKm <= r.hastaKm) {
      return { disponible: true, costo: r.costo };
    }
  }
  const max = ordenados[ordenados.length - 1];
  if (distanciaKm > max.hastaKm) {
    return {
      disponible: false,
      mensaje: `Tu ubicación está fuera de nuestra zona de cobertura (máx. ${max.hastaKm} km). Te contactaremos para coordinar la entrega.`,
    };
  }
  return { disponible: false, mensaje: "No se pudo calcular el envío." };
}

export function calcularContraPuntos(
  destino: { lat: number; lng: number },
  puntos: { id: string; nombre: string; lat: number; lng: number; activo: boolean }[],
  rangos: RangoDelivery[],
): CalculoDelivery {
  const activos = puntos.filter((p) => p.activo);
  if (activos.length === 0) {
    return { disponible: false, mensaje: "No hay puntos de origen activos." };
  }
  let mejor: { distancia: number; punto: typeof activos[number] } | null = null;
  for (const p of activos) {
    const d = haversineKm(destino, { lat: p.lat, lng: p.lng });
    if (!mejor || d < mejor.distancia) {
      mejor = { distancia: d, punto: p };
    }
  }
  if (!mejor) return { disponible: false, mensaje: "Error al calcular distancia." };
  const calc = calcularCostoDelivery(mejor.distancia, rangos);
  return {
    disponible: calc.disponible,
    costo: calc.costo,
    distanciaKm: mejor.distancia,
    puntoOrigenId: mejor.punto.id,
    puntoOrigenNombre: mejor.punto.nombre,
    mensaje: calc.mensaje,
  };
}
