import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { orders, resellerMovements } from "@/db/schema";
import { apiErrorResponse, requireOrganization } from "@/lib/current-user";

function clean(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function summarize(
  movements: Array<typeof resellerMovements.$inferSelect>,
  deliveredOrders: Array<Pick<typeof orders.$inferSelect, "boxes">>,
) {
  const received = deliveredOrders.reduce((sum, item) => sum + item.boxes, 0);
  const sold = movements
    .filter((item) => item.type === "sale")
    .reduce((sum, item) => sum + item.boxes, 0);
  const returned = movements
    .filter((item) => item.type === "return")
    .reduce((sum, item) => sum + item.boxes, 0);
  const adjustments = movements.reduce((sum, item) => {
    if (item.type === "adjustment_in") return sum + item.boxes;
    if (item.type === "adjustment_out") return sum - item.boxes;
    return sum;
  }, 0);
  const revenueCents = movements
    .filter((item) => item.type === "sale")
    .reduce((sum, item) => sum + item.totalValueCents, 0);
  const refundedCents = movements
    .filter((item) => item.type === "return")
    .reduce((sum, item) => sum + item.totalValueCents, 0);
  return {
    received,
    sold,
    returned,
    stock: received + returned + adjustments - sold,
    revenueCents,
    refundedCents,
    netRevenueCents: revenueCents - refundedCents,
  };
}

export async function GET(request: Request) {
  try {
    const { membership } = await requireOrganization(request);
    const db = getDb();
    const [movements, delivered] = await Promise.all([
      db
        .select()
        .from(resellerMovements)
        .where(eq(resellerMovements.organizationId, membership.organization.id))
        .orderBy(desc(resellerMovements.occurredAt)),
      db
        .select({ boxes: orders.boxes })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, membership.organization.id),
            eq(orders.status, "delivered"),
          ),
        ),
    ]);
    return Response.json({
      movements,
      summary: summarize(movements, delivered),
    });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível carregar as movimentações.");
  }
}

export async function POST(request: Request) {
  try {
    const { user, membership } = await requireOrganization(request);
    const payload = (await request.json()) as Record<string, unknown>;
    const type =
      payload.type === "return"
        ? "return"
        : payload.type === "adjustment_in"
          ? "adjustment_in"
          : payload.type === "adjustment_out"
            ? "adjustment_out"
            : "sale";
    if (
      (type === "adjustment_in" || type === "adjustment_out") &&
      membership.role === "seller"
    ) {
      return Response.json(
        { error: "Ajustes de estoque exigem acesso de gerente." },
        { status: 403 },
      );
    }
    const boxes = Math.max(1, Math.min(9999, Math.floor(Number(payload.boxes) || 0)));
    const unitValueCents = Math.max(
      0,
      Math.round(Number(payload.unitValue) * 100) || 0,
    );
    const channel = ["whatsapp", "instagram", "store", "referral"].includes(
      String(payload.channel),
    )
      ? (String(payload.channel) as "whatsapp" | "instagram" | "store" | "referral")
      : "other";
    const occurredAt = /^\d{4}-\d{2}-\d{2}$/.test(String(payload.occurredAt))
      ? String(payload.occurredAt)
      : new Date().toISOString().slice(0, 10);
    const db = getDb();
    const [existingMovements, deliveredOrders] = await Promise.all([
      db
        .select()
        .from(resellerMovements)
        .where(eq(resellerMovements.organizationId, membership.organization.id)),
      db
        .select({ boxes: orders.boxes })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, membership.organization.id),
            eq(orders.status, "delivered"),
          ),
        ),
    ]);
    const current = summarize(existingMovements, deliveredOrders);
    if ((type === "sale" || type === "adjustment_out") && boxes > current.stock) {
      return Response.json(
        { error: `Estoque insuficiente. Saldo atual: ${current.stock} caixa(s).` },
        { status: 409 },
      );
    }
    if (type === "return" && boxes > current.sold - current.returned) {
      return Response.json(
        { error: "A devolução não pode ser maior que as vendas registradas." },
        { status: 409 },
      );
    }
    const movement: typeof resellerMovements.$inferInsert = {
      id: `mov_${crypto.randomUUID()}`,
      organizationId: membership.organization.id,
      recordedBy: user.id,
      type,
      boxes,
      unitValueCents,
      totalValueCents: boxes * unitValueCents,
      channel,
      reference: clean(payload.reference, 100),
      notes: clean(payload.notes, 500),
      occurredAt,
      createdAt: new Date().toISOString(),
    };
    await db.insert(resellerMovements).values(movement);
    return Response.json({ movement });
  } catch (error) {
    console.error("movement_creation_failed", error);
    return apiErrorResponse(error, "Não foi possível registrar a movimentação.");
  }
}
