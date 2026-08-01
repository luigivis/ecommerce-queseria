import { describe, it, expect } from "vitest";
import { resolveOgImage, toAbsoluteUrl } from "@/lib/url";

describe("resolveOgImage", () => {
  it("usa la primera imagen del producto cuando existe", () => {
    const og = resolveOgImage(
      JSON.stringify(["/uploads/queso-fresco.webp"]),
      "/uploads/logo.png",
      "https://queseria.example.com"
    );
    expect(og).toBe("https://queseria.example.com/uploads/queso-fresco.webp");
  });

  it("usa el logo cuando el producto no tiene imagen", () => {
    const og = resolveOgImage(
      JSON.stringify([]),
      "/uploads/logo.png",
      "https://queseria.example.com"
    );
    expect(og).toBe("https://queseria.example.com/uploads/logo.png");
  });

  it("usa el placeholder cuando no hay ni imagen ni logo", () => {
    const og = resolveOgImage(
      JSON.stringify([]),
      null,
      "https://queseria.example.com"
    );
    expect(og).toBe("https://queseria.example.com/og-default.png");
  });

  it("preserva URLs absolutas si ya lo son", () => {
    const og = resolveOgImage(
      JSON.stringify(["https://cdn.example.com/img.webp"]),
      null,
      "https://queseria.example.com"
    );
    expect(og).toBe("https://cdn.example.com/img.webp");
  });

  it("funciona con imagenes null", () => {
    const og = resolveOgImage(
      null,
      "/uploads/logo.png",
      "https://queseria.example.com"
    );
    expect(og).toBe("https://queseria.example.com/uploads/logo.png");
  });

  it("maneja baseUrl con slash final", () => {
    const og = resolveOgImage(
      JSON.stringify(["/uploads/x.webp"]),
      null,
      "https://queseria.example.com/"
    );
    expect(og).toBe("https://queseria.example.com/uploads/x.webp");
  });

  it("agrega slash si el path no lo tiene", () => {
    const og = resolveOgImage(
      JSON.stringify(["uploads/x.webp"]),
      null,
      "https://queseria.example.com"
    );
    expect(og).toBe("https://queseria.example.com/uploads/x.webp");
  });

  it("maneja JSON malformado en imagenes", () => {
    const og = resolveOgImage(
      "not json",
      "/uploads/logo.png",
      "https://queseria.example.com"
    );
    expect(og).toBe("https://queseria.example.com/uploads/logo.png");
  });
});

describe("toAbsoluteUrl", () => {
  it("devuelve undefined para null o undefined", () => {
    expect(toAbsoluteUrl(null, "https://x.com")).toBeUndefined();
    expect(toAbsoluteUrl(undefined, "https://x.com")).toBeUndefined();
    expect(toAbsoluteUrl("", "https://x.com")).toBeUndefined();
  });

  it("preserva URLs absolutas", () => {
    expect(toAbsoluteUrl("https://x.com/img.webp", "https://y.com")).toBe("https://x.com/img.webp");
  });

  it("convierte paths relativos", () => {
    expect(toAbsoluteUrl("/uploads/x.webp", "https://y.com")).toBe("https://y.com/uploads/x.webp");
  });

  it("agrega slash si falta", () => {
    expect(toAbsoluteUrl("uploads/x.webp", "https://y.com")).toBe("https://y.com/uploads/x.webp");
  });

  it("remueve slash final del baseUrl", () => {
    expect(toAbsoluteUrl("/x.webp", "https://y.com/")).toBe("https://y.com/x.webp");
  });
});
