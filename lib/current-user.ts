import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { memberships, organizations } from "@/db/schema";
import { getSessionUser, type SessionUser } from "@/lib/auth";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Autenticação necessária.");
    this.name = "AuthenticationRequiredError";
  }
}

export class OrganizationRequiredError extends Error {
  constructor() {
    super("Conclua o cadastro da sua revenda para continuar.");
    this.name = "OrganizationRequiredError";
  }
}

export async function getCurrentUser(request: Request): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) throw new AuthenticationRequiredError();
  return user;
}

export async function getCurrentContext(request: Request) {
  const user = await getCurrentUser(request);
  const [membership] = await getDb()
    .select({
      id: memberships.id,
      role: memberships.role,
      status: memberships.status,
      organization: organizations,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(eq(memberships.userId, user.id), eq(memberships.status, "active")),
    )
    .limit(1);
  return { user, membership: membership ?? null };
}

export async function requireOrganization(request: Request) {
  const context = await getCurrentContext(request);
  if (!context.membership) throw new OrganizationRequiredError();
  return { ...context, membership: context.membership };
}

export function apiErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof AuthenticationRequiredError) {
    return Response.json(
      { error: "Entre com seu acesso individual para continuar." },
      { status: 401 },
    );
  }
  if (error instanceof OrganizationRequiredError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  return Response.json({ error: fallbackMessage }, { status: 500 });
}
