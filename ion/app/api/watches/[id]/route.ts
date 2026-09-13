import { z } from "zod";
import { getWatch, setWatchStatus } from "@/lib/watches";
import type { ApiError, ApiErrorCode } from "@/lib/types";

export const dynamic = "force-dynamic";

const Body = z.object({ status: z.enum(["paused", "active"]) });

function fail(status: number, code: ApiErrorCode, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ApiError, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  // ApiErrorCode has no code for a malformed body; only our own UI calls this,
  // and it sends one of the two literals.
  if (!parsed.success) return fail(400, "invalid_condition", "A watch can only be paused or active.");

  const watch = await getWatch(id);
  if (!watch) return fail(404, "not_found", "We don't have a watch with that id.");

  await setWatchStatus(id, parsed.data.status);
  return Response.json({ status: parsed.data.status });
}
