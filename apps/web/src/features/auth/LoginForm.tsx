import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Form";
import { errorMessage } from "@/lib/api";
import { LabeledField } from "./fields";
import { loginSchema, type LoginValues } from "./schemas";
import { useAuthActions } from "./useAuthActions";

const list = {
  hidden: { opacity: 0 },
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 28 } },
};

export function LoginForm() {
  const { login } = useAuthActions();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      await login.mutateAsync(values);
    } catch (error) {
      const message = errorMessage(error, "Could not sign you in");
      setServerError(message);
      setError("root", { type: "server", message });
    }
  };

  const rootError = serverError ?? errors.root?.message;

  return (
    <motion.form
      noValidate
      aria-label="Sign in to Wolvinix"
      variants={list}
      initial="hidden"
      animate="show"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <motion.div variants={item}>
        <h2 className="font-display text-2xl font-bold">Welcome back</h2>
        <p className="text-muted mt-1 text-sm">Sign in to catch up with your pack.</p>
      </motion.div>

      {rootError && (
        <motion.div
          role="alert"
          variants={item}
          className="border-danger/30 bg-danger-soft text-danger flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{rootError}</span>
        </motion.div>
      )}

      <motion.div variants={item}>
        <LabeledField id="login-email" label="Email" required error={errors.email?.message}>
          <Input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            leftIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
            invalid={Boolean(errors.email)}
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </LabeledField>
      </motion.div>

      <motion.div variants={item}>
        <LabeledField
          id="login-password"
          label="Password"
          required
          error={errors.password?.message}
        >
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </LabeledField>
      </motion.div>

      <motion.div variants={item} className="flex items-center justify-end">
        <Link
          to="/forgot-password"
          className="text-accent hover:text-brand-500 text-sm font-medium transition-colors"
        >
          Forgot password?
        </Link>
      </motion.div>

      <motion.div variants={item}>
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          loading={login.isPending}
          rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
        >
          Sign in
        </Button>
      </motion.div>
    </motion.form>
  );
}

export default LoginForm;
