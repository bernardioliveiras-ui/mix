import { env } from "cloudflare:workers";

type AsaasEnvironment = "sandbox" | "production";
type RuntimeSecrets = {
  ASAAS_API_KEY?: string;
  ASAAS_ENVIRONMENT?: string;
};

type AsaasErrorBody = {
  errors?: Array<{ code?: string; description?: string }>;
};

export type AsaasCustomer = { id: string };
export type AsaasPayment = {
  id: string;
  status?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  externalReference?: string;
};
export type AsaasPixQrCode = {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
};

export class AsaasRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AsaasRequestError";
  }
}

export function getAsaasConfig() {
  const runtime = env as unknown as RuntimeSecrets;
  const apiKey = runtime.ASAAS_API_KEY?.trim();
  const environment: AsaasEnvironment =
    runtime.ASAAS_ENVIRONMENT === "production" ? "production" : "sandbox";
  return {
    apiKey,
    environment,
    configured: Boolean(apiKey),
    baseUrl:
      environment === "production"
        ? "https://api.asaas.com/v3"
        : "https://api-sandbox.asaas.com/v3",
  };
}

async function asaasRequest<T>(path: string, init: RequestInit = {}) {
  const config = getAsaasConfig();
  if (!config.apiKey) {
    throw new AsaasRequestError(
      "A conta Asaas ainda não foi conectada à plataforma.",
      503,
    );
  }
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "user-agent": `Mix10Pro-Revendedores/1.0 (${config.environment})`,
      access_token: config.apiKey,
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as AsaasErrorBody & T;
  if (!response.ok) {
    throw new AsaasRequestError(
      body.errors?.[0]?.description ??
        "O Asaas não conseguiu concluir a solicitação.",
      response.status,
    );
  }
  return body;
}

export async function findOrCreateCustomer(input: {
  organizationId: string;
  storedCustomerId?: string | null;
  name: string;
  cpfCnpj: string;
  email: string;
  phone: string;
}) {
  if (input.storedCustomerId) return { id: input.storedCustomerId };
  const externalReference = `mix10-org:${input.organizationId}`;
  const existing = await asaasRequest<{ data?: AsaasCustomer[] }>(
    `/customers?externalReference=${encodeURIComponent(externalReference)}&limit=1`,
  );
  if (existing.data?.[0]?.id) return existing.data[0];
  return asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      cpfCnpj: input.cpfCnpj,
      email: input.email,
      mobilePhone: input.phone,
      externalReference,
      notificationDisabled: false,
    }),
  });
}

export async function createPayment(input: {
  customerId: string;
  orderId: string;
  orderNumber: string;
  billingType: "PIX" | "UNDEFINED";
  valueCents: number;
  dueDate: string;
}) {
  return asaasRequest<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.billingType,
      value: input.valueCents / 100,
      dueDate: input.dueDate,
      description: `Pedido ${input.orderNumber} - MIX10 PRO`,
      externalReference: input.orderId,
    }),
  });
}

export async function getPixQrCode(paymentId: string) {
  return asaasRequest<AsaasPixQrCode>(
    `/payments/${encodeURIComponent(paymentId)}/pixQrCode`,
  );
}
