import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { authLoginCodes } from "@/db/schema";
import {
  AuthConfigurationError,
  generateLoginCode,
  hashLoginCode,
  hashRequestKey,
  normalizeEmail,
} from "@/lib/auth";
import { sendPlatformEmail } from "@/lib/email";

const CODE_DURATION_MINUTES = 10;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: unknown };
    const email = normalizeEmail(payload.email);
    if (!email) {
      return Response.json(
        { error: "Informe um endereço de e-mail válido." },
        { status: 400 },
      );
    }

    const now = new Date();
    const recentSince = new Date(now.getTime() - 15 * 60_000).toISOString();
    const requestKey = await hashRequestKey(request);
    const db = getDb();
    const [emailRequests, deviceRequests] = await Promise.all([
      db
        .select({ createdAt: authLoginCodes.createdAt })
        .from(authLoginCodes)
        .where(
          and(
            eq(authLoginCodes.email, email),
            gt(authLoginCodes.createdAt, recentSince),
          ),
        )
        .orderBy(desc(authLoginCodes.createdAt))
        .limit(5),
      db
        .select({ id: authLoginCodes.id })
        .from(authLoginCodes)
        .where(
          and(
            eq(authLoginCodes.requestKey, requestKey),
            gt(authLoginCodes.createdAt, recentSince),
          ),
        )
        .limit(10),
    ]);

    if (emailRequests.length > 0) {
      const lastSentAt = new Date(emailRequests[0].createdAt).getTime();
      if (now.getTime() - lastSentAt < 60_000) {
        return Response.json(
          { error: "Aguarde um minuto antes de solicitar outro código." },
          { status: 429 },
        );
      }
    }
    if (emailRequests.length >= 5 || deviceRequests.length >= 10) {
      return Response.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
        { status: 429 },
      );
    }

    const id = crypto.randomUUID();
    const code = generateLoginCode();
    const expiresAt = new Date(
      now.getTime() + CODE_DURATION_MINUTES * 60_000,
    ).toISOString();
    await db.insert(authLoginCodes).values({
      id,
      email,
      requestKey,
      codeHash: await hashLoginCode(id, email, code),
      expiresAt,
      createdAt: now.toISOString(),
    });

    const delivery = await sendPlatformEmail({
      to: email,
      subject: "Seu código de acesso à MIX10 PRO",
      text: `Seu código de acesso é ${code}. Ele expira em ${CODE_DURATION_MINUTES} minutos. Se você não solicitou este acesso, ignore esta mensagem.`,
    });
    if (!delivery.sent) {
      await db
        .delete(authLoginCodes)
        .where(
          and(eq(authLoginCodes.id, id), isNull(authLoginCodes.consumedAt)),
        );
      return Response.json(
        { error: "O envio de e-mail ainda não está configurado." },
        { status: 503 },
      );
    }

    return Response.json({ sent: true, expiresInMinutes: CODE_DURATION_MINUTES });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    console.error("auth_code_request_failed", error);
    return Response.json(
      { error: "Não foi possível enviar o código de acesso." },
      { status: 500 },
    );
  }
}
