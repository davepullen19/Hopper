/* eslint-disable @next/next/no-img-element */
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

// Matches the logo's background colour so the mark blends into the page.
const BRAND_BG = "#f09538";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: BRAND_BG }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/logo.svg" alt="Hopper" className="h-32 w-32 rounded-2xl" />
          <h1 className="text-2xl font-semibold text-white">Hopper</h1>
        </div>
        <SignInForm from={from} />
      </div>
    </div>
  );
}
