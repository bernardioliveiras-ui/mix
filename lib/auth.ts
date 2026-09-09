import { env } from "cloudflare:workers";
import { and, eq, gt } from "drizzle-orm";

import { getDb } from "@/db";
import { authSessions, users } from "@/db/schema";

const SESSION_COOKIE = "mix10_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

type AuthEnvironment = {
  AUTH_SECRET?: string;
  ADMIN_EMAILS?: string;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  systemRole: "member" | "admin";
  onboardingStatus: "profile" | "complete";
};

export class AuthConfigurationError extends Error {
  constructor() {
    super("O acesso por e-mail ainda não foi configurado no servidor.");
    this.name = "AuthConfigurationError";
  }
}

function runtime() {
  return env as unknown as AuthEnvironment;
}

function authSecret() {
  const secret = runtime().AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) throw new AuthConfigurationError();
  return secret;
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function randomToken(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function keyedHash(purpose: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`${purpose}:${value}`)),
  );
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(item.slice(separator + 1).trim());
  }
  return null;
}

function secureCookieSuffix(request: Request) {
  return new URL(request.url).protocol === "https:" ? "; Secure" : "";
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLocaleLowerCase("pt-BR");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  return email;
}

export function isAdminEmail(email: string) {
  return (runtime().ADMIN_EMAILS ?? "")
    .split(/[;,\n]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export function generateLoginCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (bytes[0] % 900000));
}

export async function hashLoginCode(id: string, email: string, code: string) {
  return keyedHash("login-code", `${id}:${email}:${code}`);
}

export async function hashRequestKey(request: Request) {
  const address =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const agent = request.headers.get("user-agent") ?? "unknown";
  return keyedHash("request", `${address}:${agent}`);
}

export function safeHashEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hashSessionToken(token: string) {
  return keyedHash("session", token);
}

export async function createSession(userId: string, request: Request) {
  const token = randomToken();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SESSION_DURATION_SECONDS * 1000,
  ).toISOString();
  await getDb().insert(authSessions).values({
    tokenHash: await hashSessionToken(token),
    userId,
    expiresAt,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
  });
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${secureCookieSuffix(request)}`;
}

export async function getSessionUser(
  request: Request,
): Promise<SessionUser | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const [session] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      systemRole: users.systemRole,
      onboardingStatus: users.onboardingStatus,
    })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(
      and(
        eq(authSessions.tokenHash, await hashSessionToken(token)),
        gt(authSessions.expiresAt, new Date().toISOString()),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  if (!session) return null;
  return {
    ...session,
    systemRole:
      session.systemRole === "admin" || isAdminEmail(session.email)
        ? "admin"
        : "member",
  };
}

export async function revokeSession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return;
  await getDb()
    .delete(authSessions)
    .where(eq(authSessions.tokenHash, await hashSessionToken(token)));
}

export function clearSessionCookie(request: Request) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookieSuffix(request)}`;
}
