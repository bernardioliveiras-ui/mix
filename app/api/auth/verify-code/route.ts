import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import {
  authLoginCodes,
  invitations,
  memberships,
  users,
} from "@/db/schema";
import {
  AuthConfigurationError,
  createSession,
  hashLoginCode,
  isAdminEmail,
  normalizeEmail,
  safeHashEqual,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: unknown;
      code?: unknown;
    };
    const email = normalizeEmail(payload.email);
    const code =
      typeof payload.code === "string"
        ? payload.code.replace(/\D/g, "").slice(0, 6)
        : "";
    if (!email || code.length !== 6) {
      return Response.json(
        { error: "Informe o e-mail e o código de 6 dígitos." },
        { status: 400 },
      );
    }

    const db = getDb();
    const [loginCode] = await db
      .select()
      .from(authLoginCodes)
      .where(
        and(
          eq(authLoginCodes.email, email),
          isNull(authLoginCodes.consumedAt),
        ),
      )
      .orderBy(desc(authLoginCodes.createdAt))
      .limit(1);
    if (!loginCode || new Date(loginCode.expiresAt).getTime() <= Date.now()) {
      return Response.json(
        { error: "O código expirou. Solicite um novo código." },
        { status: 400 },
      );
    }
    if (loginCode.attempts >= 5) {
      return Response.json(
        { error: "Código bloqueado por excesso de tentativas." },
        { status: 429 },
      );
    }
    const receivedHash = await hashLoginCode(loginCode.id, email, code);
    if (!safeHashEqual(receivedHash, loginCode.codeHash)) {
      await db
        .update(authLoginCodes)
        .set({ attempts: loginCode.attempts + 1 })
        .where(eq(authLoginCodes.id, loginCode.id));
      return Response.json({ error: "Código incorreto." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const admin = isAdminEmail(email);
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user) {
      const id = `usr_${crypto.randomUUID()}`;
      await db.insert(users).values({
        id,
        email,
        name: email.split("@")[0] || "Revendedor",
        systemRole: admin ? "admin" : "member",
        emailVerifiedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    } else {
      [user] = await db
        .update(users)
        .set({
          emailVerifiedAt: now,
          systemRole: admin ? "admin" : user.systemRole,
          updatedAt: now,
        })
        .where(eq(users.id, user.id))
        .returning();
    }
    if (!user) throw new Error("Falha ao criar usuário.");

    const [invite] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, now),
        ),
      )
      .orderBy(desc(invitations.createdAt))
      .limit(1);
    if (invite) {
      await db
        .insert(memberships)
        .values({
          organizationId: invite.organizationId,
          userId: user.id,
          role: invite.role,
        })
        .onConflictDoNothing();
      await db
        .update(invitations)
        .set({ acceptedAt: now })
        .where(eq(invitations.id, invite.id));
      await db
        .update(users)
        .set({ onboardingStatus: "complete", updatedAt: now })
        .where(eq(users.id, user.id));
      user = { ...user, onboardingStatus: "complete" };
    }

    const consumed = await db
      .update(authLoginCodes)
      .set({ consumedAt: now })
      .where(
        and(eq(authLoginCodes.id, loginCode.id), isNull(authLoginCodes.consumedAt)),
      )
      .returning({ id: authLoginCodes.id });
    if (consumed.length === 0) {
      return Response.json(
        { error: "Este código já foi utilizado." },
        { status: 409 },
      );
    }

    return Response.json(
      {
        authenticated: true,
        needsOnboarding: user.onboardingStatus !== "complete" && !admin,
      },
      { headers: { "set-cookie": await createSession(user.id, request) } },
    );
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    console.error("auth_code_verification_failed", error);
    return Response.json(
      { error: "Não foi possível confirmar o código de acesso." },
      { status: 500 },
    );
  }
}
