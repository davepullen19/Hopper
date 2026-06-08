"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { signInSchema, type SignInInput } from "@/lib/validations";
import { signIn } from "@/app/actions/auth";

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
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Email" required error={errors.email?.message}>
            <Input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="you@brewery.com"
              autoFocus
            />
          </Field>
          <Field label="Password" required error={errors.password?.message}>
            <Input
              {...register("password")}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
