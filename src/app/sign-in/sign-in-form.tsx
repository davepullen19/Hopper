"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInSchema, type SignInInput } from "@/lib/validations";
import { signIn } from "@/app/actions/auth";

const inputClass =
  "border-white/40 bg-white/15 text-white placeholder:text-white/70 shadow-none focus-visible:ring-white/60 focus-visible:ring-2";

export function SignInForm({ from }: { from?: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInInput) {
    const res = await signIn(values);
    if (res.ok) {
      toast.success("Signed in");
      // Full navigation so middleware + layout pick up the new session.
      window.location.assign(from && from.startsWith("/") ? from : "/");
    } else {
      toast.error(res.error ?? "Sign in failed");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="sr-only">
          Email
        </Label>
        <Input
          id="email"
          {...register("email")}
          type="email"
          autoComplete="email"
          placeholder="Email"
          autoFocus
          className={inputClass}
        />
        {errors.email && (
          <p className="text-xs font-medium text-white">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="sr-only">
          Password
        </Label>
        <Input
          id="password"
          {...register("password")}
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          className={inputClass}
        />
        {errors.password && (
          <p className="text-xs font-medium text-white">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-white text-[#b35a1f] hover:bg-white/90"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
