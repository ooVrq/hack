"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-runs the server component every `seconds` so cron-driven checks show up. */
export function RefreshOnInterval({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}
