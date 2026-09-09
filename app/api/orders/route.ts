import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { orderEvents, orders, organizations } from "@/db/schema";
import {
  AsaasRequestError,
  createPayment,
  findOrCreateCustomer,
  getAsaasConfig,
  getPixQrCode,
} from "@/lib/asaas";
import { apiErrorResponse, requireOrganization } from "@/lib/current-user";

const KITS = {
  kit20: { boxes: 20, unitPriceCents: 7499, totalCents: 149980 },
  kit30: { boxes: 30, unitPriceCents: 7499, totalCents: 224970 },
} as const;

function clean(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function digits(value: unknown) {
  return clean(value, 32).replace(/\D/g, "");
}

function orderNumber(id: string) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `MX-${today}-${id.replace(/\D/g, "").slice(-5).padStart(5, "0")}`;
}

function dueDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 3);
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const { membership } = await requireOrganization(request);
    const data = await getDb()
      .select()
      .from(orders)
      .where(eq(orders.organizationId, membership.organization.id))
      .orderBy(desc(orders.createdAt));
    return Response.json({ orders: data });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível carregar os pedidos.");
  }
}

export async function POST(request: Request) {
  try {
    const { user, membership } = await requireOrganization(request);
    if (membership.organization.status !== "active") {
      return Response.json(
        { error: "A conta da revenda está suspensa." },
        { status: 403 },
      );
    }
    const payload = (await request.json()) as Record<string, unknown>;
    const kit = payload.kit === "kit30" ? "kit30" : "kit20";
    const pricing = KITS[kit];
    const billingType = payload.billingType === "PIX" ? "PIX" : "UNDEFINED";
    const address = {
      postalCode: digits(payload.postalCode),
      street: clean(payload.street),
      number: clean(payload.number, 32),
      complement: clean(payload.complement),
      district: clean(payload.district),
      city: clean(payload.city),
      state: clean(payload.state, 2).toUpperCase(),
    };
    if (
      address.postalCode.length !== 8 ||
      !address.street ||
      !address.number ||
      !address.district ||
      !address.city ||
      address.state.length !== 2
    ) {
      return Response.json(
        { error: "Confira o endereço de entrega." },
        { status: 400 },
      );
    }

    const id = `ord_${Date.now()}_${crypto.randomUUID()}`;
    const number = orderNumber(id);
    const paymentDueDate = dueDate();
    const now = new Date().toISOString();
    const db = getDb();
    await db.insert(orders).values({
      id,
      orderNumber: number,
      organizationId: membership.organization.id,
      createdBy: user.id,
      kit,
      ...pricing,
      billingType,
      paymentDueDate,
      shippingPostalCode: address.postalCode,
      shippingStreet: address.street,
      shippingNumber: address.number,
      shippingComplement: address.complement,
      shippingDistrict: address.district,
      shippingCity: address.city,
      shippingState: address.state,
      notes: clean(payload.notes, 500),
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(orderEvents).values({
      orderId: id,
      status: "payment_pending",
      message: "Pedido criado e aguardando pagamento.",
      actorId: user.id,
      createdAt: now,
    });

    try {
      const customer = await findOrCreateCustomer({
        organizationId: membership.organization.id,
        storedCustomerId: membership.organization.asaasCustomerId,
        name: membership.organization.legalName,
        cpfCnpj: membership.organization.cpfCnpj,
        email: membership.organization.email,
        phone: membership.organization.phone,
      });
      if (!membership.organization.asaasCustomerId) {
        await db
          .update(organizations)
          .set({ asaasCustomerId: customer.id, updatedAt: now })
          .where(eq(organizations.id, membership.organization.id));
      }
      const payment = await createPayment({
        customerId: customer.id,
        orderId: id,
        orderNumber: number,
        billingType,
        valueCents: pricing.totalCents,
        dueDate: paymentDueDate,
      });
      const qr = billingType === "PIX" ? await getPixQrCode(payment.id) : null;
      await db
        .update(orders)
        .set({
          asaasPaymentId: payment.id,
          asaasInvoiceUrl: payment.invoiceUrl ?? null,
          asaasQrPayload: qr?.payload ?? null,
          asaasQrImage: qr?.encodedImage ?? null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orders.id, id));
      return Response.json({
        order: {
          id,
          orderNumber: number,
          status: "payment_pending",
          environment: getAsaasConfig().environment,
        },
        payment: {
          invoiceUrl: payment.invoiceUrl ?? null,
          qrPayload: qr?.payload ?? null,
          qrImage: qr?.encodedImage ?? null,
          qrExpiresAt: qr?.expirationDate ?? null,
        },
      });
    } catch (error) {
      await db
        .update(orders)
        .set({ status: "payment_error", updatedAt: new Date().toISOString() })
        .where(eq(orders.id, id));
      await db.insert(orderEvents).values({
        orderId: id,
        status: "payment_error",
        message: "Pedido salvo, mas a cobrança não pôde ser criada.",
        actorId: user.id,
      });
      if (error instanceof AsaasRequestError) {
        return Response.json(
          {
            order: { id, orderNumber: number, status: "payment_error" },
            error: error.message,
          },
          { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("order_creation_failed", error);
    return apiErrorResponse(error, "Não foi possível criar o pedido.");
  }
}
