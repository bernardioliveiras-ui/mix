import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import { apiErrorResponse, getCurrentUser } from "@/lib/current-user";

function clean(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function digits(value: unknown) {
  return clean(value, 24).replace(/\D/g, "");
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const payload = (await request.json()) as Record<string, unknown>;
    const name = clean(payload.name);
    const phone = digits(payload.phone);
    const legalName = clean(payload.legalName);
    const tradeName = clean(payload.tradeName) || legalName;
    const cpfCnpj = digits(payload.cpfCnpj);
    if (
      !name ||
      phone.length < 10 ||
      !legalName ||
      (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)
    ) {
      return Response.json(
        { error: "Preencha nome, telefone e CPF/CNPJ da revenda." },
        { status: 400 },
      );
    }

    const db = getDb();
    const [existingMembership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .limit(1);
    if (existingMembership) {
      return Response.json({ complete: true, alreadyConfigured: true });
    }

    const now = new Date().toISOString();
    const organizationId = `org_${crypto.randomUUID()}`;
    await db.insert(organizations).values({
      id: organizationId,
      legalName,
      tradeName,
      cpfCnpj,
      email: user.email,
      phone,
      postalCode: digits(payload.postalCode),
      street: clean(payload.street),
      number: clean(payload.number, 32),
      complement: clean(payload.complement),
      district: clean(payload.district),
      city: clean(payload.city),
      state: clean(payload.state, 2).toUpperCase(),
      utmSource: clean(payload.utmSource, 120),
      utmMedium: clean(payload.utmMedium, 120),
      utmCampaign: clean(payload.utmCampaign, 180),
      utmContent: clean(payload.utmContent, 180),
      landingPage: clean(payload.landingPage, 500),
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(memberships).values({
      organizationId,
      userId: user.id,
      role: "owner",
      status: "active",
    });
    await db
      .update(users)
      .set({ name, phone, onboardingStatus: "complete", updatedAt: now })
      .where(eq(users.id, user.id));
    return Response.json({ complete: true, organizationId });
  } catch (error) {
    console.error("onboarding_failed", error);
    return apiErrorResponse(error, "Não foi possível concluir o cadastro.");
  }
}
