import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { manualProgress } from "@/db/schema";
import { apiErrorResponse, getCurrentUser } from "@/lib/current-user";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const [progress] = await getDb()
      .select()
      .from(manualProgress)
      .where(eq(manualProgress.userId, user.id))
      .limit(1);
    return Response.json({ progress: progress ?? { lastPage: 1, completedAt: null } });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível carregar o progresso.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const payload = (await request.json()) as { page?: unknown; complete?: unknown };
    const page = Math.max(1, Math.min(10, Number(payload.page) || 1));
    const now = new Date().toISOString();
    const completedAt = payload.complete === true ? now : null;
    await getDb()
      .insert(manualProgress)
      .values({ userId: user.id, lastPage: page, completedAt, updatedAt: now })
      .onConflictDoUpdate({
        target: manualProgress.userId,
        set: { lastPage: page, completedAt, updatedAt: now },
      });
    return Response.json({ saved: true });
  } catch (error) {
    return apiErrorResponse(error, "Não foi possível salvar o progresso.");
  }
}
