import { z } from "zod";
import { extract } from "@/lib/extract";
import { robotsAllows } from "@/lib/robots";
import { safeFetch } from "@/lib/safeFetch";
import { createWatch } from "@/lib/watches";
import type { ApiError, ApiErrorCode, CreateWatchResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  url: z
    .string()
    .max(2048)
    .refine((value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }),
  condition: z.string().trim().min(1).max(500),
  email: z.email(),
  overrideRobots: z.boolean().optional(),
});

const FIELD_ERRORS: Record<string, { code: ApiErrorCode; message: string }> = {
  url: { code: "invalid_url", message: "Enter a full web address starting with http:// or https://" },
  condition: {
    code: "invalid_condition",
    message: "Tell us what to watch for, in 500 characters or less.",
  },
  email: { code: "invalid_email", message: "Enter an email address we can send the alert to." },
};

function fail(status: number, code: ApiErrorCode, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ApiError, { status });
}

export async function POST(request: Request): Promise<Response> {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0].path[0] ?? "url");
    const { code, message } = FIELD_ERRORS[field] ?? FIELD_ERRORS.url;
    return fail(400, code, message);
  }
  const { url, condition, email, overrideRobots } = parsed.data;

  // Fetch once, now, so the user finds out about a dead or JS-only page while
  // they are still looking at the form.
  const page = await safeFetch(url);
  if (!page.ok) return fail(422, page.code, page.message);

  const { text, hash } = extract(page.html);
  if (!text) {
    return fail(
      422,
      "empty_page",
      "We loaded the page but found nothing readable — it may build its content with JavaScript.",
    );
  }

  const allowed = await robotsAllows(url);
  if (!allowed && !overrideRobots) {
    return fail(
      409,
      "robots_disallowed",
      "This site's robots.txt asks automated tools not to read that page. You can watch it anyway.",
    );
  }

  const id = await createWatch({
    url,
    condition,
    email,
    robotsBlocked: !allowed,
    text,
    hash,
    statusCode: page.status,
  });
  return Response.json({ id } satisfies CreateWatchResponse, { status: 201 });
}
