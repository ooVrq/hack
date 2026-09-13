/** The eye wordmark from the launch page, reused on the confirmation page. */
export function EyeMark() {
  return (
    <svg
      viewBox="0 0 124 68"
      aria-hidden="true"
      className="w-32 text-foreground sm:w-44"
      fill="none"
      stroke="currentColor"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 35 C 30 9, 88 7, 114 33" />
      <path d="M114 33 C 92 57, 31 59, 6 35" />
      <circle cx="59" cy="33" r="9.5" strokeWidth={4} />
      <circle cx="55.5" cy="29.5" r="2" fill="currentColor" stroke="none" />
      <path
        d="M53 15 L50 6 M66 15 L68 6 M78 16 L84 9 M90 19 L98 14 M100 23 L109 20"
        strokeWidth={3.5}
      />
    </svg>
  );
}
