import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { errorMessage } from "@/lib/api";
import { toast } from "sonner";
import { LabeledField } from "@/features/auth/fields";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/features/auth/schemas";
import { Stepper } from "@/features/auth/Stepper";
import { useAuthActions } from "@/features/auth/useAuthActions";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuthActions();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setServerError(null);
    try {
      await forgotPassword.mutateAsync(values);
      // The API never confirms whether the address exists — neither do we.
      toast.success("Check your inbox", {
        description: "If an account exists for that email, a 6-digit code is on its way.",
      });
      navigate(`/reset-password?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      setServerError(errorMessage(error, "Could not start the reset right now"));
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="from-brand-500/10 via-background to-background absolute inset-0 -z-10 bg-gradient-to-b"
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="w-full max-w-md"
      >
        <Link
          to="/auth"
          className="text-muted hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>

        <div className="glass border-border rounded-2xl border p-5 shadow-lg sm:p-7">
          <div className="mb-5 flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <span className="font-display text-lg font-bold">
              wolvinix<span className="text-accent">.</span>
            </span>
          </div>

          <Stepper current={1} />

          <h1 className="font-display text-2xl font-bold">Reset your password</h1>
          <p className="text-muted mt-1.5 text-sm">
            Enter the email you signed up with and we'll send a one-time code.
          </p>

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {serverError && (
              <p
                role="alert"
                className="border-danger/30 bg-danger-soft text-danger rounded-xl border px-3.5 py-3 text-sm"
              >
                {serverError}
              </p>
            )}

            <LabeledField id="forgot-email" label="Email" required error={errors.email?.message}>
              <Input
                id="forgot-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                leftIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
                invalid={Boolean(errors.email)}
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </LabeledField>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              loading={forgotPassword.isPending}
              rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            >
              Send code
            </Button>
          </form>

          <p className="bg-surface-2 text-subtle mt-5 flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed">
            <ShieldCheck className="text-lime mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            For your safety we never reveal whether an email is registered — you'll get the same
            message either way.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
