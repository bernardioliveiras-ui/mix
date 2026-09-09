import { env } from "cloudflare:workers";

type EmailEnvironment = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

export async function sendPlatformEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const runtime = env as unknown as EmailEnvironment;
  const apiKey = runtime.RESEND_API_KEY?.trim();
  const from = runtime.EMAIL_FROM?.trim();
  if (!apiKey || !from) return { sent: false, reason: "not_configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!response.ok) {
      console.error("email_delivery_failed", response.status);
      return { sent: false, reason: "provider_error" };
    }
    return { sent: true };
  } catch (error) {
    console.error("email_delivery_failed", error);
    return { sent: false, reason: "network_error" };
  }
}
