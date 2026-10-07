import mongoose from "mongoose";
import { getEnv } from "./env.js";
import { logger } from "../lib/logger.js";

const INITIAL_DELAY_MS = 1_000;
const MAX_DELAY_MS = 15_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ConnectOptions {
  retries?: number;
  uri?: string;
}

/** Connects to MongoDB with exponential backoff; fails fast with a clear error. */
export async function connectDB(options: ConnectOptions = {}): Promise<typeof mongoose> {
  const uri = options.uri ?? getEnv().MONGODB_URI;
  const retries = options.retries ?? 5;
  let delay = INITIAL_DELAY_MS;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5_000,
        connectTimeoutMS: 5_000,
      });
      logger.info({ db: conn.connection.name }, "mongodb connected");
      return conn;
    } catch (error) {
      logger.warn(
        { attempt, retries, delayMs: delay, err: error },
        "mongodb connection attempt failed",
      );
      if (attempt >= retries) break;
      await sleep(delay);
      delay = Math.min(delay * 2, MAX_DELAY_MS);
    }
  }

  throw new Error(`Could not connect to MongoDB after ${retries} attempts: ${uri}`);
}

export function isDbUp(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info("mongodb disconnected");
  }
}
