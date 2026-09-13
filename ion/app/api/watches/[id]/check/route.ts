import { runCheck } from "@/lib/check";
import type { ApiError, CheckNowResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** "Check now": the same pipeline the cron tick runs, for one watch, inline. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const result = await runCheck(id);
  if (!result) {
    return Response.json(
      { error: { code: "not_found", message: "We don't have a watch with that id." } } satisfies ApiError,
      { status: 404 },
    );
  }
  return Response.json(result satisfies CheckNowResponse);
}
