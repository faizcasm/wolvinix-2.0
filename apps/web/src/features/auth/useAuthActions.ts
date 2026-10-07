import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { post } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { User } from "@/types";

export interface AuthSession {
  user: User;
  token?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  email: string;
  otp: string;
  password: string;
}

/**
 * All auth mutations in one place so the store update + redirect after a
 * successful sign-in/sign-up is identical no matter which form calls it.
 *
 * Password recovery deliberately does **not** navigate — the pages drive the
 * stepper so they can show the generic "if that email exists…" copy.
 */
export function useAuthActions() {
  const navigate = useNavigate();

  const login: UseMutationResult<AuthSession, Error, LoginInput> = useMutation({
    mutationFn: (body: LoginInput) => post<AuthSession>("/auth/login", body),
    onSuccess: ({ user }) => {
      useAuthStore.getState().setUser(user);
      navigate("/", { replace: true });
    },
  });

  const signup: UseMutationResult<AuthSession, Error, SignupInput> = useMutation({
    mutationFn: (body: SignupInput) => post<AuthSession>("/auth/signup", body),
    onSuccess: ({ user }) => {
      useAuthStore.getState().setUser(user);
      navigate("/", { replace: true });
    },
  });

  const forgotPassword: UseMutationResult<{ ok: boolean }, Error, ForgotPasswordInput> =
    useMutation({
      mutationFn: (body: ForgotPasswordInput) =>
        post<{ ok: boolean }>("/auth/forgot-password", body),
    });

  const resetPassword: UseMutationResult<{ ok: boolean }, Error, ResetPasswordInput> = useMutation({
    mutationFn: (body: ResetPasswordInput) => post<{ ok: boolean }>("/auth/reset-password", body),
  });

  return { login, signup, forgotPassword, resetPassword };
}
