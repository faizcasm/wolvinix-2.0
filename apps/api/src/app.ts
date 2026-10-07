import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import { getEnv, parseOrigins } from "./config/env.js";
import { httpLogger } from "./lib/logger.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { authRouter } from "./modules/auth/routes.js";
import { clansRouter } from "./modules/clans/routes.js";
import { healthRouter } from "./modules/health/routes.js";
import { mediaRouter } from "./modules/media/routes.js";
import { messagesRouter } from "./modules/messages/routes.js";
import { notificationsRouter } from "./modules/notifications/routes.js";
import { postsRouter } from "./modules/posts/routes.js";
import { reviewsRouter } from "./modules/reviews/routes.js";
import { statsRouter } from "./modules/stats/routes.js";
import { storiesRouter } from "./modules/stories/routes.js";
import { usersRouter } from "./modules/users/routes.js";

const app = express();

// Behind the dev proxy / load balancer — required for correct client IPs in
// rate limiting.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet());
app.use(httpLogger);

// CORS: env is read lazily *inside* the handler so configuration is validated
// before any request (server.ts calls getEnv() on boot).
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      let allowed: string[] = [];
      try {
        allowed = parseOrigins(getEnv().CLIENT);
      } catch {
        callback(null, false);
        return;
      }
      callback(null, allowed.includes(origin));
    },
  }),
);

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(mongoSanitize());

// Liveness probe first — never rate limited.
app.use("/api/health", healthRouter);
app.use("/api", globalLimiter);

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/posts", postsRouter);
app.use("/api/stories", storiesRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/clans", clansRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/media", mediaRouter);

app.use(notFound);
app.use(errorHandler);

export { app };
export default app;
