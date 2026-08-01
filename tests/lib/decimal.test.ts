import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { toNumber, toNumberOrNull } from "@/lib/decimal";

describe("toNumber", () => {
  it("convierte Decimal a number", () => {
    expect(toNumber(new Prisma.Decimal("180.50"))).toBe(180.5);
  });

  it("retorna number sin cambios", () => {
    expect(toNumber(42)).toBe(42);
  });

  it("retorna 0 para null", () => {
    expect(toNumber(null)).toBe(0);
  });

  it("retorna 0 para undefined", () => {
    expect(toNumber(undefined)).toBe(0);
  });

  it("retorna 0 para Decimal 0", () => {
    expect(toNumber(new Prisma.Decimal(0))).toBe(0);
  });
});

describe("toNumberOrNull", () => {
  it("retorna null para null", () => {
    expect(toNumberOrNull(null)).toBeNull();
  });

  it("retorna null para undefined", () => {
    expect(toNumberOrNull(undefined)).toBeNull();
  });

  it("convierte Decimal a number", () => {
    expect(toNumberOrNull(new Prisma.Decimal("220.00"))).toBe(220);
  });

  it("retorna number sin cambios", () => {
    expect(toNumberOrNull(15.5)).toBe(15.5);
  });
});
