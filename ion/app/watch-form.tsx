"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const BAR =
  "relative block w-full border border-border bg-transparent px-6 py-4 font-mono text-base text-foreground transition-colors duration-150 placeholder:text-muted focus:z-10 focus:border-foreground focus:outline-none";

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

export function WatchForm() {
  const [values, setValues] = useState(["", "", ""]);
  const [step, setStep] = useState(0);
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

  return (
    <form
      className="flex flex-col"
      onSubmit={(e) => e.preventDefault()} // no API yet; don't navigate away
    >
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
          className={`${BAR} hover:bg-foreground hover:text-background`}
        >
          keep an eye on
        </button>
      </Reveal>
    </form>
  );
}
