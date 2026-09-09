import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  memberships,
  organizations,
  orders,
  resellerMovements,
  users,
} from "@/db/schema";
import { apiErrorResponse, getCurrentUser } from "@/lib/current-user";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (user.systemRole !== "admin") {
      return Response.json({ error: "Acesso restrito." }, { status: 403 });
    }
    const db = getDb();
    const [orderRows, organizationRows, memberRows, movementRows] = await Promise.all([
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          kit: orders.kit,
          boxes: orders.boxes,
          totalCents: orders.totalCents,
          status: orders.status,
          trackingCode: orders.trackingCode,
          createdAt: orders.createdAt,
          organizationId: organizations.id,
          organizationName: organizations.tradeName,
          buyerName: users.name,
          buyerEmail: users.email,
        })
        .from(orders)
        .innerJoin(organizations, eq(organizations.id, orders.organizationId))
        .innerJoin(users, eq(users.id, orders.createdBy))
        .orderBy(desc(orders.createdAt)),
      db.select().from(organizations).orderBy(desc(organizations.createdAt)),
      db
        .select({
          organizationId: memberships.organizationId,
          userId: users.id,
          name: users.name,
          email: users.email,
          role: memberships.role,
          status: memberships.status,
        })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId)),
      db
        .select({
          id: resellerMovements.id,
          organizationId: resellerMovements.organizationId,
          organizationName: organizations.tradeName,
          type: resellerMovements.type,
          boxes: resellerMovements.boxes,
          totalValueCents: resellerMovements.totalValueCents,
          channel: resellerMovements.channel,
          occurredAt: resellerMovements.occurredAt,
          recordedBy: users.name,
        })
        .from(resellerMovements)
        .innerJoin(
          organizations,
          eq(organizations.id, resellerMovements.organizationId),
        )
        .innerJoin(users, eq(users.id, resellerMovements.recordedBy))
        .orderBy(desc(resellerMovements.occurredAt)),
    ]);
    return Response.json({
      orders: orderRows,
      organizations: organizationRows,
      members: memberRows,
      movements: movementRows,
    });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível carregar a administração.");
  }
}
