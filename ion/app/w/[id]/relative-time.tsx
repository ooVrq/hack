"use client";

import { useEffect, useState } from "react";

function formatRelative(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Ticks every second so "12s ago" stays live without a page refresh. */
export function RelativeTime({ date }: { date: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!date) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [date]);

  if (!date) return <span>never</span>;

  const ms = now - new Date(date).getTime();
  return <span title={new Date(date).toLocaleString()}>{formatRelative(ms)}</span>;
}
