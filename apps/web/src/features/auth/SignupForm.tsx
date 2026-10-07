import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, AlertTriangle, AtSign, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Form";
import { errorMessage } from "@/lib/api";
import { LabeledField } from "./fields";
import { signupSchema, type SignupValues } from "./schemas";
import { StrengthMeter } from "./StrengthMeter";
import { useAuthActions } from "./useAuthActions";

const list = {
  hidden: { opacity: 0 },
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 28 },
  },
};

export function SignupForm() {
  const { signup } = useAuthActions();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const password = watch("password") ?? "";

  const onSubmit = async (values: SignupValues) => {
    setServerError(null);
    try {
      await signup.mutateAsync({
        name: values.name,
        username: values.username,
        email: values.email,
        password: values.password,
      });
    } catch (error) {
      const message = errorMessage(error, "Could not create your account");
      setServerError(message);
      setError("root", { type: "server", message });
    }
  };

  const rootError = serverError ?? errors.root?.message;

  return (
    <motion.form
      noValidate
      aria-label="Create a Wolvinix account"
      variants={list}
      initial="hidden"
      animate="show"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <motion.div variants={item}>
        <h2 className="font-display text-2xl font-bold">Join the pack</h2>
        <p className="text-muted mt-1 text-sm">Free forever. Your first post takes 30 seconds.</p>
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
        <LabeledField id="signup-name" label="Display name" required error={errors.name?.message}>
          <Input
            id="signup-name"
            autoComplete="name"
            placeholder="Faizan Hameed"
            leftIcon={<User className="h-4 w-4" aria-hidden="true" />}
            invalid={Boolean(errors.name)}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </LabeledField>
      </motion.div>

      <motion.div variants={item}>
        <LabeledField
          id="signup-username"
          label="Username"
          required
          error={errors.username?.message}
          hint="Your handle — letters, numbers and underscores."
        >
          <Input
            id="signup-username"
            autoComplete="username"
            placeholder="faizan"
            leftIcon={<AtSign className="h-4 w-4" aria-hidden="true" />}
            invalid={Boolean(errors.username)}
            aria-invalid={Boolean(errors.username)}
            {...register("username")}
          />
        </LabeledField>
      </motion.div>

      <motion.div variants={item}>
        <LabeledField id="signup-email" label="Email" required error={errors.email?.message}>
          <Input
            id="signup-email"
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
          id="signup-password"
          label="Password"
          required
          error={errors.password?.message}
        >
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            invalid={Boolean(errors.password)}
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </LabeledField>
        <div className="mt-2">
          <StrengthMeter password={password} />
        </div>
      </motion.div>

      <motion.div variants={item}>
        <LabeledField
          id="signup-confirm"
          label="Confirm password"
          required
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="signup-confirm"
            autoComplete="new-password"
            placeholder="Repeat it"
            invalid={Boolean(errors.confirmPassword)}
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
        </LabeledField>
      </motion.div>

      <motion.div variants={item}>
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          loading={signup.isPending}
          rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
        >
          Create account
        </Button>
        <p className="text-subtle mt-3 text-center text-xs">
          By joining you agree to keep Wolvinix welcoming for every player.
        </p>
      </motion.div>
    </motion.form>
  );
}

export default SignupForm;
