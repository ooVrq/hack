"use client";

import { useEffect, useState } from "react";
import type { WatchStatus } from "@/lib/types";

/**
 * Ticks every second so the "next check in Ns" countdown stays live, and holds
 * while the watch is paused. The parent keys this on status + nextCheckAt so a
 * resume remounts it with a fresh clock instead of a stale one.
 */
export function NextCheck({ date, status }: { date: string; status: WatchStatus }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status === "paused") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  if (status === "paused") return <span>paused</span>;

  const seconds = Math.max(0, Math.round((new Date(date).getTime() - now) / 1000));
  return <span>{seconds === 0 ? "any moment" : `in ${seconds}s`}</span>;
}
