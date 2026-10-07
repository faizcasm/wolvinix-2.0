import { Router } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { protect } from "../../middleware/protect.js";
import { authLimiter, forgotLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "./schemas.js";
import {
  forgotPassword,
  login,
  logout,
  me,
  resetPassword,
  signup,
  socketTicket,
} from "./controller.js";

export const authRouter = Router();

authRouter.post("/signup", authLimiter, validate({ body: signupSchema }), asyncHandler(signup));
authRouter.post("/login", authLimiter, validate({ body: loginSchema }), asyncHandler(login));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", protect, asyncHandler(me));
authRouter.post(
  "/forgot-password",
  forgotLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(forgotPassword),
);
authRouter.post(
  "/reset-password",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(resetPassword),
);
authRouter.get("/socket-ticket", protect, asyncHandler(socketTicket));
