"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/dialog";
import type { ApiError, CreateWatchInput, CreateWatchResponse } from "@/lib/types";

const BAR =
  "relative block w-full border border-border bg-transparent px-6 py-4 font-mono text-base text-foreground transition-colors duration-150 placeholder:text-muted focus:z-10 focus:border-foreground focus:outline-none disabled:opacity-50";

const DIALOG_BAR =
  "flex-1 border border-border bg-transparent px-4 py-3 font-mono text-sm text-foreground transition-colors duration-150 hover:border-foreground focus:z-10 focus:border-foreground focus:outline-none";

const FIELDS = [
  { id: "url", type: "url", label: "URL to watch", placeholder: "enter url" },
  {
    id: "condition",
    type: "text",
    label: "What to watch for",
    placeholder: "what are u tracking?",
  },
  {
    id: "email",
    type: "email",
    label: "Email to notify",
    placeholder: "email to notify you",
  },
] as const;

// grid-rows 0fr→1fr is what makes the slide animate; a plain height:auto cannot
// be transitioned. `inert` keeps the collapsed rows out of tab order.
function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <div
      className={`-mt-px grid transition-all duration-150 ease-out ${
        show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden" inert={!show}>
        {children}
      </div>
    </div>
  );
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  const at = value.indexOf("@");
  if (at <= 0 || at === value.length - 1) return false;
  const domain = value.slice(at + 1);
  const dot = domain.indexOf(".");
  return dot > 0 && dot < domain.length - 1;
}

type DialogState =
  | { kind: "info"; title: string; message: string; focusRow?: number }
  | { kind: "robots"; title: string; message: string };

export function WatchForm() {
  const router = useRouter();
  const [values, setValues] = useState(["", "", ""]);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const submit = useRef<HTMLButtonElement>(null);

  const focusRow = (row: number) =>
    (row < FIELDS.length ? inputs.current[row] : submit.current)?.focus();

  // Focus the row Enter just revealed, after it has been committed and is no
  // longer inert.
  useEffect(() => {
    if (step > 0) focusRow(step);
  }, [step]);

  const advance = (row: number) => {
    if (values[row].trim() === "") return;
    if (row + 1 <= step) focusRow(row + 1);
    else setStep(row + 1);
  };

  const openInfoDialog = (title: string, message: string, focus?: number) =>
    setDialog({ kind: "info", title, message, focusRow: focus });

  const closeDialog = () => {
    const row = dialog?.kind === "info" ? dialog.focusRow : undefined;
    setDialog(null);
    if (row !== undefined) focusRow(row);
  };

  const validate = (): boolean => {
    if (!isValidUrl(values[0])) {
      openInfoDialog(
        "check that again",
        "that doesn't look like a web address — include http:// or https://",
        0,
      );
      return false;
    }
    if (values[1].trim() === "") {
      openInfoDialog("check that again", "tell us what you're watching for", 1);
      return false;
    }
    if (!isValidEmail(values[2])) {
      openInfoDialog("check that again", "that doesn't look like an email address", 2);
      return false;
    }
    return true;
  };

  const submitWatch = async (overrideRobots: boolean) => {
    const body: CreateWatchInput = {
      url: values[0],
      condition: values[1],
      email: values[2],
      ...(overrideRobots ? { overrideRobots: true } : {}),
    };

    setPending(true);
    try {
      const res = await fetch("/api/watches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 201) {
        const data = (await res.json()) as CreateWatchResponse;
        router.push(`/w/${data.id}/created`);
        return;
      }

      const data = (await res.json()) as ApiError;
      const { code, message } = data.error;

      if (res.status === 409 && code === "robots_disallowed") {
        setDialog({
          kind: "robots",
          title: "this site asks bots to stay out",
          message:
            "This site's robots.txt asks automated visitors not to read this page. You can keep watching it anyway, but KeepAnIOn.tech is not responsible for any rules you break by doing so.",
        });
        return;
      }

      const focus =
        code === "invalid_url"
          ? 0
          : code === "invalid_condition"
            ? 1
            : code === "invalid_email"
              ? 2
              : undefined;
      openInfoDialog("couldn't start watching", message, focus);
    } catch {
      openInfoDialog("couldn't start watching", "couldn't reach the server — try again");
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    if (!validate()) return;
    void submitWatch(false);
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit}>
      {FIELDS.map((field, i) => {
        const row = (
          <>
            <label htmlFor={field.id} className="sr-only">
              {field.label}
            </label>
            <input
              ref={(el) => {
                inputs.current[i] = el;
              }}
              id={field.id}
              name={field.id}
              type={field.type}
              value={values[i]}
              disabled={pending}
              onChange={(e) =>
                setValues((prev) =>
                  prev.map((v, j) => (j === i ? e.target.value : v)),
                )
              }
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                advance(i);
              }}
              placeholder={field.placeholder}
              className={BAR}
            />
          </>
        );

        return i === 0 ? (
          <div key={field.id}>{row}</div>
        ) : (
          <Reveal key={field.id} show={step >= i}>
            {row}
          </Reveal>
        );
      })}

      <Reveal show={step >= FIELDS.length}>
        <button
          ref={submit}
          type="submit"
          disabled={pending}
          className={`${BAR} hover:bg-foreground hover:text-background disabled:hover:bg-transparent disabled:hover:text-foreground`}
        >
          {pending ? "checking the page…" : "keep an eye on"}
        </button>
      </Reveal>

      <Dialog
        open={dialog !== null}
        onClose={closeDialog}
        title={dialog?.title ?? ""}
        actions={
          dialog?.kind === "robots" ? (
            <>
              <button type="button" className={DIALOG_BAR} onClick={closeDialog}>
                go back
              </button>
              <button
                type="button"
                className={`${DIALOG_BAR} hover:bg-foreground hover:text-background`}
                onClick={() => {
                  setDialog(null);
                  void submitWatch(true);
                }}
              >
                watch it anyway
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`${DIALOG_BAR} hover:bg-foreground hover:text-background`}
              onClick={closeDialog}
            >
              ok
            </button>
          )
        }
      >
        {dialog?.message}
      </Dialog>
    </form>
  );
}
