import {
  AuthConfigurationError,
  clearSessionCookie,
  revokeSession,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await revokeSession(request);
  } catch (error) {
    if (!(error instanceof AuthConfigurationError)) {
      console.error("auth_logout_failed", error);
    }
  }
  return Response.json(
    { signedOut: true },
    { headers: { "set-cookie": clearSessionCookie(request) } },
  );
}
