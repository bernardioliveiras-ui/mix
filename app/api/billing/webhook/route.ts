import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { asaasEvents, orderEvents, orders } from "@/db/schema";
import { safeHashEqual } from "@/lib/auth";

type RuntimeSecrets = { ASAAS_WEBHOOK_TOKEN?: string };
type AsaasWebhook = {
  id?: string;
  event?: string;
  payment?: { id?: string; status?: string; externalReference?: string };
};

function orderStatusForEvent(event: string) {
  if (["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"].includes(event)) return "paid";
  if (["PAYMENT_REFUNDED", "PAYMENT_DELETED", "PAYMENT_CHARGEBACK_REQUESTED"].includes(event)) {
    return "cancelled";
  }
  return null;
}

export async function POST(request: Request) {
  const expected = (env as unknown as RuntimeSecrets).ASAAS_WEBHOOK_TOKEN?.trim();
  const received = request.headers.get("asaas-access-token") ?? "";
  if (!expected || !safeHashEqual(expected, received)) {
    return Response.json({ error: "Webhook não autorizado." }, { status: 401 });
  }
  try {
    const payload = (await request.json()) as AsaasWebhook;
    const eventId = payload.id?.trim();
    const eventType = payload.event?.trim();
    const paymentId = payload.payment?.id?.trim();
    if (!eventId || !eventType) {
      return Response.json({ error: "Evento inválido." }, { status: 400 });
    }
    const db = getDb();
    const inserted = await db
      .insert(asaasEvents)
      .values({ eventId, eventType, paymentId: paymentId ?? null })
      .onConflictDoNothing()
      .returning({ id: asaasEvents.eventId });
    if (inserted.length === 0) {
      return Response.json({ received: true, duplicate: true });
    }
    if (!paymentId) return Response.json({ received: true, ignored: true });

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.asaasPaymentId, paymentId))
      .limit(1);
    if (!order) return Response.json({ received: true, unmatched: true });
    const status = orderStatusForEvent(eventType);
    if (status && status !== order.status) {
      const now = new Date().toISOString();
      await db
        .update(orders)
        .set({ status, updatedAt: now })
        .where(eq(orders.id, order.id));
      await db.insert(orderEvents).values({
        orderId: order.id,
        status,
        message:
          status === "paid"
            ? "Pagamento confirmado pelo Asaas."
            : "Cobrança cancelada ou estornada.",
        createdAt: now,
      });
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("asaas_webhook_failed", error);
    return Response.json(
      { error: "Não foi possível registrar o evento." },
      { status: 500 },
    );
  }
}
