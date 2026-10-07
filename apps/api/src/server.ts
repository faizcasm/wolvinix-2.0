import "dotenv/config";
import http from "node:http";
import { app } from "./app.js";
import { connectDB, disconnectDB } from "./config/database.js";
import { getEnv, parseOrigins, type Env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { startCleanupJob, stopCleanupJob } from "./lib/scheduler.js";
import { closeSocket, initSocket } from "./sockets/index.js";

// Fail fast — validate configuration before anything else happens.
let env: Env;
try {
  env = getEnv();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

async function main(): Promise<void> {
  try {
    await connectDB({ uri: env.MONGODB_URI });
  } catch (error) {
    logger.fatal({ err: error }, "database connection failed");
    process.exit(1);
  }

  const server = http.createServer(app);
  initSocket(server, { origins: parseOrigins(env.CLIENT), secret: env.JWT_SECRET });
  const cleanupTimer = startCleanupJob();

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "graceful shutdown started");

    stopCleanupJob(cleanupTimer);
    void closeSocket();

    server.close(async () => {
      try {
        await disconnectDB();
      } catch (error) {
        logger.error({ err: error }, "error while closing mongodb connection");
      }
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "unhandled promise rejection");
  });
  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "uncaught exception");
    process.exit(1);
  });

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, "wolvinix api listening");
  });
}

void main().catch((error) => {
  logger.fatal({ err: error }, "server failed to start");
  process.exit(1);
});
