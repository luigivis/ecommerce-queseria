import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(async (pw: string) => `hashed:${pw}`),
  },
}));

import { PUT } from "@/app/api/auth/me/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/me", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 401 si no hay sesión", async () => {
    mockGetSession.mockResolvedValue({ userId: null });
    const res = await PUT(makeRequest({ nombre: "X" }) as never);
    expect(res.status).toBe(401);
  });

  it("responde 400 con body inválido", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "a@b.c" });
    const res = await PUT(makeRequest({ email: "no-es-email" }) as never);
    expect(res.status).toBe(400);
  });

  it("actualiza nombre cuando todo es válido", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "a@b.c" });
    mockUserUpdate.mockResolvedValue({
      id: "u1",
      email: "a@b.c",
      nombre: "Nuevo",
      role: "ADMIN",
    });
    const res = await PUT(makeRequest({ nombre: "Nuevo" }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nombre).toBe("Nuevo");
    expect(body.passwordHash).toBeUndefined();
  });

  it("responde 403 si passwordActual no coincide", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "a@b.c" });
    mockUserFindUnique.mockResolvedValue({ id: "u1", passwordHash: "hashed:other" });
    const bcrypt = await import("bcryptjs");
    (bcrypt.default.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const res = await PUT(
      makeRequest({ passwordActual: "wrong", passwordNuevo: "newpass1" }) as never
    );
    expect(res.status).toBe(403);
  });

  it("responde 400 si email choca con otro usuario", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "a@b.c" });
    mockUserFindUnique.mockResolvedValue({ id: "u2", email: "other@b.c" });
    const res = await PUT(makeRequest({ email: "other@b.c" }) as never);
    expect(res.status).toBe(400);
  });

  it("actualiza password cuando el actual coincide", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "a@b.c" });
    mockUserFindUnique.mockResolvedValue({ id: "u1", passwordHash: "hashed:old" });
    mockUserUpdate.mockResolvedValue({
      id: "u1",
      email: "a@b.c",
      nombre: "X",
      role: "ADMIN",
    });
    const bcrypt = await import("bcryptjs");
    (bcrypt.default.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await PUT(
      makeRequest({ passwordActual: "old", passwordNuevo: "newpass1" }) as never
    );
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({ passwordHash: "hashed:newpass1" }),
      })
    );
  });
});