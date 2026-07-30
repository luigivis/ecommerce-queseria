import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  email?: string;
  role?: "ADMIN" | "OPERADOR";
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || "dev-secret-change-me-please-change-now-32",
  cookieName: "queseria_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};
