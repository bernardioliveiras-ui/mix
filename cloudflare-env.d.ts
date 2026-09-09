declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    AUTH_SECRET?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    ADMIN_EMAILS?: string;
    ASAAS_API_KEY?: string;
    ASAAS_ENVIRONMENT?: string;
    ASAAS_WEBHOOK_TOKEN?: string;
  }
}
