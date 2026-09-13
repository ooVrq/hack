"use client";

import { useEffect, useState } from "react";

/** Ticks every second so the "next check in Ns" countdown stays live. */
export function NextCheck({ date }: { date: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.round((new Date(date).getTime() - now) / 1000));
  return <span>{seconds === 0 ? "any moment" : `in ${seconds}s`}</span>;
}
