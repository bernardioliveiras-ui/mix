import { AuthConfigurationError } from "@/lib/auth";
import { getCurrentContext } from "@/lib/current-user";

export async function GET(request: Request) {
  try {
    const context = await getCurrentContext(request);
    return Response.json(
      {
        authenticated: true,
        user: context.user,
        membership: context.membership
          ? {
              id: context.membership.id,
              role: context.membership.role,
              organization: context.membership.organization,
            }
          : null,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return Response.json(
        { authenticated: false, error: error.message },
        { status: 503 },
      );
    }
    return Response.json(
      { authenticated: false, user: null, membership: null },
      { headers: { "cache-control": "no-store" } },
    );
  }
}
