import { Beer } from "lucide-react";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Beer className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">Hopper</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your brewery operations
          </p>
        </div>
        <SignInForm from={from} />
      </div>
    </div>
  );
}
