import { NextRequest, NextResponse } from "next/server";
import { setJobBoardOpen } from "@/lib/demo";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const key = formData.get("key") as string | null;
  const open = formData.get("open") as string | null;

  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "bad key" } },
      { status: 401 },
    );
  }

  await setJobBoardOpen(open === "true");

  const redirectUrl = new URL("/demo/job-board", request.url);
  redirectUrl.searchParams.set("admin", key);

  return NextResponse.redirect(redirectUrl, 303);
}
