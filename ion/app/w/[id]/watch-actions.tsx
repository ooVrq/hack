"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WatchStatus } from "@/lib/types";

const BAR =
  "flex-1 border border-border bg-transparent px-6 py-4 font-mono text-sm text-foreground transition-colors duration-150 hover:bg-foreground hover:text-background disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground";

export function WatchActions({ id, status }: { id: string; status: WatchStatus }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [toggling, setToggling] = useState(false);
  const busy = checking || toggling;

  const checkNow = async () => {
    setChecking(true);
    try {
      await fetch(`/api/watches/${id}/check`, { method: "POST" });
      router.refresh();
    } finally {
      setChecking(false);
    }
  };

  const toggleStatus = async () => {
    setToggling(true);
    const next: WatchStatus = status === "paused" ? "active" : "paused";
    try {
      await fetch(`/api/watches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex gap-3">
      <button type="button" className={BAR} onClick={checkNow} disabled={busy}>
        {checking ? "checking…" : "check now"}
      </button>
      <button type="button" className={BAR} onClick={toggleStatus} disabled={busy}>
        {toggling ? "working…" : status === "paused" ? "resume" : "pause"}
      </button>
    </div>
  );
}
