import pino from "pino";
import pinoHttp from "pino-http";
import { nanoid } from "nanoid";

/**
 * Structured logger. Level comes straight from the process environment so that
 * importing the logger never depends on `getEnv()` (unit tests import modules
 * that pull this file in).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "wolvinix-api" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "password",
      "otp",
      "token",
    ],
    censor: "[redacted]",
  },
});

/** pino-http instance: request ids, health-check noise suppressed. */
export const httpLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers["x-request-id"];
    const id = (Array.isArray(incoming) ? incoming[0] : incoming) || nanoid(12);
    res.setHeader("x-request-id", id);
    return id;
  },
  autoLogging: {
    ignore: (req) => req.url === "/api/health",
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req(req: { method?: string; url?: string; id?: string }) {
      return { id: req.id, method: req.method, url: req.url };
    },
    res(res: { statusCode?: number }) {
      return { statusCode: res.statusCode };
    },
  },
});
