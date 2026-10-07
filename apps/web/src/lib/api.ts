import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { ApiEnvelope } from "@/types";

/**
 * Single axios instance for the whole app.
 * The session lives in an httpOnly cookie, so every request is same-origin
 * with `withCredentials` — no tokens ever touch JavaScript.
 */
export const api: AxiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

let onUnauthorized: (() => void) | null = null;

/**
 * Registered once by the auth provider. Called when the server reports the
 * session is gone so the store can drop the cached user.
 */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";

    // /auth/me returning 401 is an expected "not signed in", not an error.
    const isSessionProbe = url.includes("/auth/me");
    if (status === 401 && !isSessionProbe) onUnauthorized?.();

    return Promise.reject(error);
  },
);

function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  const body = response.data;
  if (!body?.success) {
    throw new Error(body?.error?.message ?? "Unexpected response from server");
  }
  return body.data as T;
}

/** GET returning the envelope `data` plus optional pagination meta. */
export async function getData<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<{ data: T; meta?: ApiEnvelope<T>["meta"] }> {
  const response = await api.get<ApiEnvelope<T>>(url, config);
  return { data: response.data.data, meta: response.data.meta };
}

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<ApiEnvelope<T>>(url, config);
  return unwrap(response);
}

export async function post<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.post<ApiEnvelope<T>>(url, body, config);
  return unwrap(response);
}

export async function patch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.patch<ApiEnvelope<T>>(url, body, config);
  return unwrap(response);
}

export async function put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.put<ApiEnvelope<T>>(url, body, config);
  return unwrap(response);
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<ApiEnvelope<T>>(url, config);
  return unwrap(response);
}

/** Reads the human-readable message from any thrown error. */
export function errorMessage(error: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiEnvelope<never> | undefined;
    if (body?.error?.message) return body.error.message;
    if (error.code === "ECONNABORTED") return "Request timed out — check your connection";
    if (!error.response) return "Cannot reach the server — is the API running?";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
