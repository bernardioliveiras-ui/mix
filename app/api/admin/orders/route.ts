import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { orderEvents, orders } from "@/db/schema";
import { apiErrorResponse, getCurrentUser } from "@/lib/current-user";

const ALLOWED = new Set([
  "payment_pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "payment_error",
]);

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (user.systemRole !== "admin") {
      return Response.json({ error: "Acesso restrito." }, { status: 403 });
    }
    const payload = (await request.json()) as {
      orderId?: unknown;
      status?: unknown;
      trackingCode?: unknown;
    };
    const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
    const status = typeof payload.status === "string" ? payload.status : "";
    const trackingCode =
      typeof payload.trackingCode === "string"
        ? payload.trackingCode.trim().slice(0, 100)
        : "";
    if (!orderId || !ALLOWED.has(status)) {
      return Response.json({ error: "Alteração inválida." }, { status: 400 });
    }
    const typedStatus = status as typeof orders.$inferInsert.status;
    const now = new Date().toISOString();
    await getDb()
      .update(orders)
      .set({ status: typedStatus, trackingCode: trackingCode || null, updatedAt: now })
      .where(eq(orders.id, orderId));
    await getDb().insert(orderEvents).values({
      orderId,
      status,
      message: `Status alterado manualmente para ${status}.`,
      actorId: user.id,
      createdAt: now,
    });
    return Response.json({ updated: true });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível alterar o pedido.");
  }
}
