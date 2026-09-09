import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    systemRole: text("system_role", { enum: ["member", "admin"] })
      .notNull()
      .default("member"),
    status: text("status", { enum: ["active", "suspended"] })
      .notNull()
      .default("active"),
    onboardingStatus: text("onboarding_status", {
      enum: ["profile", "complete"],
    })
      .notNull()
      .default("profile"),
    emailVerifiedAt: text("email_verified_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_users_email").on(table.email),
    index("idx_users_status").on(table.status),
  ],
);

export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name").notNull(),
    cpfCnpj: text("cpf_cnpj").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    postalCode: text("postal_code").notNull().default(""),
    street: text("street").notNull().default(""),
    number: text("number").notNull().default(""),
    complement: text("complement").notNull().default(""),
    district: text("district").notNull().default(""),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    asaasCustomerId: text("asaas_customer_id"),
    utmSource: text("utm_source").notNull().default(""),
    utmMedium: text("utm_medium").notNull().default(""),
    utmCampaign: text("utm_campaign").notNull().default(""),
    utmContent: text("utm_content").notNull().default(""),
    landingPage: text("landing_page").notNull().default(""),
    status: text("status", { enum: ["active", "suspended"] })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_organizations_cpf_cnpj").on(table.cpfCnpj),
    index("idx_organizations_status").on(table.status),
  ],
);

export const memberships = sqliteTable(
  "memberships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "manager", "seller"] })
      .notNull()
      .default("seller"),
    status: text("status", { enum: ["active", "disabled"] })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_memberships_org_user").on(
      table.organizationId,
      table.userId,
    ),
    index("idx_memberships_user_status").on(table.userId, table.status),
  ],
);

export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: ["manager", "seller"] })
      .notNull()
      .default("seller"),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => users.id),
    acceptedAt: text("accepted_at"),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_invitations_email_expires").on(table.email, table.expiresAt),
    index("idx_invitations_org_created").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);

export const authLoginCodes = sqliteTable(
  "auth_login_codes",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    requestKey: text("request_key").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: text("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_auth_codes_email_created").on(table.email, table.createdAt),
    index("idx_auth_codes_request_created").on(
      table.requestKey,
      table.createdAt,
    ),
    index("idx_auth_codes_expires").on(table.expiresAt),
  ],
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_auth_sessions_user").on(table.userId),
    index("idx_auth_sessions_expires").on(table.expiresAt),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    kit: text("kit", { enum: ["kit20", "kit30"] }).notNull(),
    boxes: integer("boxes").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    status: text("status", {
      enum: [
        "payment_pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "payment_error",
      ],
    })
      .notNull()
      .default("payment_pending"),
    billingType: text("billing_type", { enum: ["PIX", "UNDEFINED"] })
      .notNull()
      .default("UNDEFINED"),
    asaasPaymentId: text("asaas_payment_id"),
    asaasInvoiceUrl: text("asaas_invoice_url"),
    asaasQrPayload: text("asaas_qr_payload"),
    asaasQrImage: text("asaas_qr_image"),
    paymentDueDate: text("payment_due_date"),
    shippingPostalCode: text("shipping_postal_code").notNull(),
    shippingStreet: text("shipping_street").notNull(),
    shippingNumber: text("shipping_number").notNull(),
    shippingComplement: text("shipping_complement").notNull().default(""),
    shippingDistrict: text("shipping_district").notNull(),
    shippingCity: text("shipping_city").notNull(),
    shippingState: text("shipping_state").notNull(),
    trackingCode: text("tracking_code"),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_orders_number").on(table.orderNumber),
    uniqueIndex("idx_orders_asaas_payment").on(table.asaasPaymentId),
    index("idx_orders_org_created").on(table.organizationId, table.createdAt),
    index("idx_orders_org_status").on(table.organizationId, table.status),
    index("idx_orders_status_created").on(table.status, table.createdAt),
  ],
);

export const orderEvents = sqliteTable(
  "order_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    message: text("message").notNull(),
    actorId: text("actor_id").references(() => users.id),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_order_events_order_created").on(table.orderId, table.createdAt),
  ],
);

export const asaasEvents = sqliteTable(
  "asaas_events",
  {
    eventId: text("event_id").primaryKey(),
    eventType: text("event_type").notNull(),
    paymentId: text("payment_id"),
    receivedAt: text("received_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_asaas_events_payment").on(table.paymentId)],
);

export const resellerMovements = sqliteTable(
  "reseller_movements",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id),
    type: text("type", {
      enum: ["sale", "return", "adjustment_in", "adjustment_out"],
    }).notNull(),
    boxes: integer("boxes").notNull(),
    unitValueCents: integer("unit_value_cents").notNull().default(0),
    totalValueCents: integer("total_value_cents").notNull().default(0),
    channel: text("channel", {
      enum: ["whatsapp", "instagram", "store", "referral", "other"],
    })
      .notNull()
      .default("other"),
    reference: text("reference").notNull().default(""),
    notes: text("notes").notNull().default(""),
    occurredAt: text("occurred_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_reseller_movements_org_date").on(
      table.organizationId,
      table.occurredAt,
    ),
    index("idx_reseller_movements_type_date").on(table.type, table.occurredAt),
  ],
);

export const manualProgress = sqliteTable("manual_progress", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  lastPage: integer("last_page").notNull().default(1),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
