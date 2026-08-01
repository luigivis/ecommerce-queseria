import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockUserFindMany = vi.fn();
const mockUserCreate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdateForTask3 = vi.fn();
const mockUserUniqueById = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
      findUnique: (...args: unknown[]) => {
        const arg = (args[0] as { where?: { email?: string; id?: string } })?.where;
        if (arg?.id !== undefined) return mockUserUniqueById(...args);
        return mockUserFindUnique(...args);
      },
      update: (...args: unknown[]) => mockUserUpdateForTask3(...args),
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
    expect(mockUserUpdateForTask3).not.toHaveBeenCalled();
  });

  it("crea usuario con password hasheado", async () => {
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

import { PUT, DELETE } from "@/app/api/usuarios/[id]/route";

function makePutRequest(body: unknown): Request {
  return new Request("http://localhost/api/usuarios/u1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/usuarios/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("responde 409 si intenta editarse a sí mismo", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", role: "ADMIN" });
    const res = await PUT(makePutRequest({ nombre: "X" }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(409);
  });

  it("actualiza activo a false en soft-delete", async () => {
    mockGetSession.mockResolvedValue({ userId: "admin", role: "ADMIN" });
    mockUserUpdateForTask3.mockResolvedValue({ id: "u1", email: "x@y.com", nombre: "X", role: "OPERADOR", activo: false, createdAt: new Date() });
    const res = await PUT(makePutRequest({ activo: false }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(200);
    expect(mockUserUpdateForTask3).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ activo: false }) })
    );
  });

  it("responde 400 si email choca con otro", async () => {
    mockGetSession.mockResolvedValue({ userId: "admin", role: "ADMIN" });
    mockUserFindUnique.mockResolvedValue({ id: "other", email: "y@z.com" });
    const res = await PUT(makePutRequest({ email: "y@z.com" }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/usuarios/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("responde 409 si intenta desactivarse a sí mismo", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", role: "ADMIN" });
    const res = await DELETE({} as never, { params: { id: "u1" } });
    expect(res.status).toBe(409);
  });

  it("soft-delete (activo=false) si es distinto", async () => {
    mockGetSession.mockResolvedValue({ userId: "admin", role: "ADMIN" });
    mockUserUpdateForTask3.mockResolvedValue({ id: "u1", activo: false });
    const res = await DELETE({} as never, { params: { id: "u1" } });
    expect(res.status).toBe(200);
    expect(mockUserUpdateForTask3).toHaveBeenCalledWith(
      expect.objectContaining({ data: { activo: false } })
    );
  });
});

import { PUT as PUTPassword } from "@/app/api/usuarios/[id]/password/route";

function makePasswordPut(body: unknown): Request {
  return new Request("http://localhost/api/usuarios/u1/password", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/usuarios/[id]/password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("responde 403 si no es ADMIN", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", role: "OPERADOR" });
    const res = await PUTPassword(makePasswordPut({ password: "nuevaclave1" }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(403);
  });

  it("responde 400 si password corto", async () => {
    mockGetSession.mockResolvedValue({ userId: "admin", role: "ADMIN" });
    const res = await PUTPassword(makePasswordPut({ password: "123" }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(400);
  });

  it("actualiza password cuando es válido", async () => {
    mockGetSession.mockResolvedValue({ userId: "admin", role: "ADMIN" });
    mockUserUpdateForTask3.mockResolvedValue({ id: "u1" });
    const res = await PUTPassword(makePasswordPut({ password: "nuevaclave1" }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(200);
    expect(mockUserUpdateForTask3).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: { passwordHash: "hashed:nuevaclave1" },
      })
    );
  });
});
