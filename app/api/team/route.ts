import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { invitations, memberships, users } from "@/db/schema";
import { normalizeEmail } from "@/lib/auth";
import { apiErrorResponse, requireOrganization } from "@/lib/current-user";
import { sendPlatformEmail } from "@/lib/email";

function canManage(role: string) {
  return role === "owner" || role === "manager";
}

export async function GET(request: Request) {
  try {
    const { membership } = await requireOrganization(request);
    const db = getDb();
    const [members, pendingInvites] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          status: memberships.status,
          role: memberships.role,
          joinedAt: memberships.createdAt,
        })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(eq(memberships.organizationId, membership.organization.id)),
      db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.organizationId, membership.organization.id),
            isNull(invitations.acceptedAt),
            gt(invitations.expiresAt, new Date().toISOString()),
          ),
        )
        .orderBy(desc(invitations.createdAt)),
    ]);
    return Response.json({ members, invitations: pendingInvites });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível carregar a equipe.");
  }
}

export async function POST(request: Request) {
  try {
    const { user, membership } = await requireOrganization(request);
    if (!canManage(membership.role)) {
      return Response.json(
        { error: "Somente proprietário ou gerente pode convidar usuários." },
        { status: 403 },
      );
    }
    const payload = (await request.json()) as {
      email?: unknown;
      role?: unknown;
    };
    const email = normalizeEmail(payload.email);
    const role = payload.role === "manager" ? "manager" : "seller";
    if (!email) {
      return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(
        and(
          eq(memberships.organizationId, membership.organization.id),
          eq(users.email, email),
        ),
      )
      .limit(1);
    if (existing) {
      return Response.json(
        { error: "Esse e-mail já faz parte da equipe." },
        { status: 409 },
      );
    }

    const now = new Date();
    await db.insert(invitations).values({
      id: `inv_${crypto.randomUUID()}`,
      organizationId: membership.organization.id,
      email,
      role,
      invitedBy: user.id,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString(),
      createdAt: now.toISOString(),
    });
    await sendPlatformEmail({
      to: email,
      subject: `Convite para a equipe ${membership.organization.tradeName}`,
      text: `${user.name} convidou você para acessar o Portal do Revendedor MIX10 PRO. Entre na plataforma com este e-mail para aceitar o convite.`,
    });
    return Response.json({ invited: true });
  } catch (error) {
    console.error("team_invite_failed", error);
    return apiErrorResponse(error, "Não foi possível enviar o convite.");
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, membership } = await requireOrganization(request);
    if (membership.role !== "owner") {
      return Response.json(
        { error: "Somente o proprietário pode alterar acessos." },
        { status: 403 },
      );
    }
    const payload = (await request.json()) as {
      userId?: unknown;
      status?: unknown;
    };
    const targetUserId =
      typeof payload.userId === "string" ? payload.userId.trim() : "";
    const status = payload.status === "active" ? "active" : "disabled";
    if (!targetUserId || targetUserId === user.id) {
      return Response.json(
        { error: "Não é possível alterar o próprio acesso por aqui." },
        { status: 400 },
      );
    }
    await getDb()
      .update(memberships)
      .set({ status })
      .where(
        and(
          eq(memberships.organizationId, membership.organization.id),
          eq(memberships.userId, targetUserId),
        ),
      );
    return Response.json({ updated: true });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível alterar o acesso.");
  }
}
