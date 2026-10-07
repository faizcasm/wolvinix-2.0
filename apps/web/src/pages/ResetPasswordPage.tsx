import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Key, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/Form";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { LabeledField } from "@/features/auth/fields";
import { resetPasswordSchema, type ResetPasswordValues } from "@/features/auth/schemas";
import { Stepper } from "@/features/auth/Stepper";
import { StrengthMeter } from "@/features/auth/StrengthMeter";
import { useAuthActions } from "@/features/auth/useAuthActions";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

/* ------------------------------- OTP boxes -------------------------------- */

function OtpInput({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const boxes = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? "");

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const focusBox = (index: number) => refs.current[index]?.focus();

  /** Writes `clean` digits starting at `index`, keeping the code contiguous. */
  const commit = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!clean) return;
    const next = `${value.slice(0, index)}${clean}${value.slice(index + clean.length)}`.slice(
      0,
      CODE_LENGTH,
    );
    onChange(next);
    focusBox(Math.min(CODE_LENGTH - 1, index + clean.length));
  };

  const handleChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/\D/g, "");
    if (!raw) {
      event.target.value = boxes[index];
      return;
    }
    const existing = boxes[index];
    // A digit already in the box means the keystroke appended to it; anything
    // else (paste, password-manager autofill) should fill from this box on.
    const appended = existing && raw.startsWith(existing) ? existing.length : 0;
    commit(index, raw.slice(appended));
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (boxes[index]) {
        onChange(`${value.slice(0, index)}${value.slice(index + 1)}`);
      } else if (index > 0) {
        onChange(value.slice(0, index - 1));
        focusBox(index - 1);
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    commit(index, event.clipboardData.getData("text"));
  };

  return (
    <div role="group" aria-label="6-digit verification code" className="flex gap-2 sm:gap-2.5">
      {boxes.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          id={`otp-${index}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          aria-label={`Digit ${index + 1}`}
          aria-invalid={invalid || undefined}
          value={digit}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          className={cn(
            "bg-surface-2 font-display h-12 min-w-0 flex-1 rounded-xl border text-center",
            "tabular text-foreground text-lg font-bold transition-all duration-200 outline-none",
            "placeholder:text-subtle focus:border-brand-500 focus:bg-surface focus:ring-brand-500/12 focus:ring-4",
            invalid ? "border-danger" : "border-border hover:border-border-strong",
          )}
        />
      ))}
    </div>
  );
}

/* ------------------------------ Success screen ---------------------------- */

function SuccessScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => navigate("/auth", { replace: true }), 6000);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="bg-lime-soft text-lime ring-lime/30 flex h-20 w-20 items-center justify-center rounded-full ring-1"
      >
        <Check className="h-10 w-10" aria-hidden="true" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="font-display mt-6 text-2xl font-bold"
      >
        Password updated
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="text-muted mt-2 max-w-sm text-sm"
      >
        Your new password is live. Sign in and get back to your pack — we'll take you there in a
        moment.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="mt-7 w-full max-w-xs"
      >
        <Button
          variant="gradient"
          size="lg"
          className="w-full"
          onClick={() => navigate("/auth", { replace: true })}
        >
          Go to sign in
        </Button>
      </motion.div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const email = params.get("email")?.trim() ?? "";
  const { resetPassword, forgotPassword } = useAuthActions();

  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: "", password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const otp = useWatch({ control, name: "otp" });
  const password = useWatch({ control, name: "password" });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(
      () => setSecondsLeft((current) => (current <= 1 ? 0 : current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const handleResend = async () => {
    setResending(true);
    try {
      await forgotPassword.mutateAsync({ email });
      setSecondsLeft(RESEND_SECONDS);
      toast.success("Code resent", {
        description: "If an account exists for that email, a new code is on its way.",
      });
    } catch (error) {
      toast.error(errorMessage(error, "Could not resend the code"));
    } finally {
      setResending(false);
    }
  };

  const onSubmit = async (values: ResetPasswordValues) => {
    setServerError(null);
    try {
      await resetPassword.mutateAsync({
        email,
        otp: values.otp,
        password: values.password,
      });
      setDone(true);
    } catch (error) {
      setServerError(errorMessage(error, "That code or password didn't work"));
    }
  };

  if (!email) return <Navigate to="/forgot-password" replace />;
  if (done) return <SuccessScreen />;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="from-accent/10 via-background to-background absolute inset-0 -z-10 bg-gradient-to-b"
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="w-full max-w-md"
      >
        <Link
          to="/forgot-password"
          className="text-muted hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Change email
        </Link>

        <div className="glass border-border rounded-2xl border p-5 shadow-lg sm:p-7">
          <div className="mb-5 flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <span className="font-display text-lg font-bold">
              wolvinix<span className="text-accent">.</span>
            </span>
          </div>

          <Stepper current={2} />

          <h1 className="font-display text-2xl font-bold">Enter your code</h1>
          <p className="text-muted mt-1.5 flex items-center gap-1.5 text-sm">
            <Mail className="text-subtle h-4 w-4 shrink-0" aria-hidden="true" />
            Sent to <span className="text-foreground font-medium">{email}</span>
          </p>

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            {serverError && (
              <p
                role="alert"
                className="border-danger/30 bg-danger-soft text-danger rounded-xl border px-3.5 py-3 text-sm"
              >
                {serverError}
              </p>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="otp-0"
                className="text-muted flex items-center gap-1 text-sm font-medium"
              >
                Verification code
                <span className="text-danger" aria-hidden="true">
                  *
                </span>
              </label>
              <OtpInput
                value={otp}
                onChange={(next) =>
                  setValue("otp", next, {
                    shouldDirty: true,
                    shouldValidate: Boolean(errors.otp),
                  })
                }
                invalid={Boolean(errors.otp)}
              />
              {errors.otp ? (
                <p role="alert" className="text-danger text-xs font-medium">
                  {errors.otp.message}
                </p>
              ) : (
                <p className="text-subtle text-xs">
                  The code expires 10 minutes after it was sent.
                </p>
              )}
            </div>

            <div className="border-border bg-surface-2 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5">
              <span className="text-muted text-xs">
                {secondsLeft > 0 ? (
                  <>
                    Resend available in{" "}
                    <span className="tabular text-foreground font-semibold">
                      0:{String(secondsLeft).padStart(2, "0")}
                    </span>
                  </>
                ) : (
                  "Didn't get the email?"
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={secondsLeft > 0}
                loading={resending}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={handleResend}
              >
                Resend code
              </Button>
            </div>

            <LabeledField
              id="reset-password"
              label="New password"
              required
              error={errors.password?.message}
            >
              <PasswordInput
                id="reset-password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                leftIcon={<Key className="h-4 w-4" aria-hidden="true" />}
                invalid={Boolean(errors.password)}
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </LabeledField>

            <StrengthMeter password={password ?? ""} />

            <LabeledField
              id="reset-confirm"
              label="Confirm new password"
              required
              error={errors.confirmPassword?.message}
            >
              <PasswordInput
                id="reset-confirm"
                autoComplete="new-password"
                placeholder="Repeat it"
                invalid={Boolean(errors.confirmPassword)}
                aria-invalid={Boolean(errors.confirmPassword)}
                {...register("confirmPassword")}
              />
            </LabeledField>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              loading={resetPassword.isPending}
            >
              Set new password
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
