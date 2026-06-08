export type ActionResult<T = undefined> = {
  ok: boolean;
  error?: string;
  data?: T;
};

/** Map a thrown error (often a Prisma error) to a friendly message. */
export function toErrorMessage(e: unknown, uniqueHint = "Value must be unique"): string {
  if (
    typeof e === "object" &&
    e !== null &&
    "code" in e
  ) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") return uniqueHint;
    if (code === "P2003" || code === "P2014")
      return "This record is referenced elsewhere and cannot be changed.";
    if (code === "P2025") return "Record not found.";
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
