export function toAbsoluteUrl(
  path: string | null | undefined,
  baseUrl: string
): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function resolveOgImage(
  productImages: string | null | undefined,
  logoUrl: string | null | undefined,
  baseUrl: string
): string {
  let parsedImgs: string[] = [];
  if (productImages) {
    try {
      const parsed = JSON.parse(productImages);
      if (Array.isArray(parsed)) parsedImgs = parsed;
    } catch {
      parsedImgs = [];
    }
  }
  const fallback = `${baseUrl.replace(/\/$/, "")}/og-default.png`;
  return (
    toAbsoluteUrl(parsedImgs[0], baseUrl) ||
    toAbsoluteUrl(logoUrl, baseUrl) ||
    fallback
  );
}
