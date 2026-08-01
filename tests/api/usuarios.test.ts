import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockUserFindMany = vi.fn();
const mockUserCreate = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed:${pw}`),
  },
}));

import { GET, POST } from "@/app/api/usuarios/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/usuarios", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const adminSession = {
  userId: "admin1",
  email: "admin@x.com",
  role: "ADMIN" as const,
};

describe("GET /api/usuarios", () => {
  beforeEach(() => vi.clearAllMocks());

  it("responde 401 si no hay sesión", async () => {
    mockGetSession.mockResolvedValue({ userId: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("responde 403 si no es ADMIN", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", role: "OPERADOR" });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("lista usuarios sin passwordHash", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    mockUserFindMany.mockResolvedValue([
      { id: "u1", email: "a@b.c", nombre: "A", role: "ADMIN", activo: true, createdAt: new Date() },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].passwordHash).toBeUndefined();
  });
});

describe("POST /api/usuarios", () => {
  beforeEach(() => vi.clearAllMocks());

  it("responde 401 si no es ADMIN", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", role: "VENDEDOR" });
    const res = await POST(makeRequest({ email: "x", nombre: "X", role: "ADMIN", password: "12345678" }) as never);
    expect(res.status).toBe(403);
  });

  it("responde 400 si email duplicado", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    mockUserFindUnique.mockResolvedValue({ id: "otro", email: "x@y.com" });
    const res = await POST(makeRequest({ email: "x@y.com", nombre: "X", role: "ADMIN", password: "12345678" }) as never);
    expect(res.status).toBe(400);
  });

  it("responde 400 si role inválido", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const res = await POST(makeRequest({ email: "x@y.com", nombre: "X", role: "SUPER", password: "12345678" }) as never);
    expect(res.status).toBe(400);
  });

  it("responde 400 si password corto", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const res = await POST(makeRequest({ email: "x@y.com", nombre: "X", role: "ADMIN", password: "123" }) as never);
    expect(res.status).toBe(400);
  });

  it("crea usuario si todo es válido", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      id: "u-new",
      email: "x@y.com",
      nombre: "X",
      role: "ADMIN",
      activo: true,
      createdAt: new Date(),
    });
    const res = await POST(makeRequest({ email: "x@y.com", nombre: "X", role: "ADMIN", password: "12345678" }) as never);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.passwordHash).toBeUndefined();
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: "hashed:12345678", role: "ADMIN" }),
      })
    );
  });
});
