import jwt from "jsonwebtoken";
import { getEnv } from "../../config/env.js";
import { ApiError } from "../../lib/errors.js";

export const TICKET_AUDIENCE = "wolvinix:socket-ticket";
export const DEFAULT_TICKET_TTL_SECONDS = 60;

export interface TicketOptions {
  /** Explicit secret (tests). Falls back to `JWT_SECRET`. */
  secret?: string;
  ttlSeconds?: number;
}

/**
 * Short-lived signed ticket handed to the browser by `GET /api/auth/socket-ticket`.
 * The socket handshake presents it; identity always comes from the signature.
 */
export function generateTicket(userId: string, options: TicketOptions = {}): string {
  const secret = options.secret ?? getEnv().JWT_SECRET;
  const ttl = options.ttlSeconds ?? getEnv().SOCKET_TICKET_TTL ?? DEFAULT_TICKET_TTL_SECONDS;
  return jwt.sign({ sub: userId, typ: "socket-ticket" }, secret, {
    expiresIn: ttl,
    audience: TICKET_AUDIENCE,
  });
}

export interface VerifiedTicket {
  userId: string;
}

/** Verifies a socket ticket. Throws a 401 ApiError for anything invalid. */
export function verifyTicket(token: unknown, options: TicketOptions = {}): VerifiedTicket {
  if (typeof token !== "string" || token.length === 0) {
    throw ApiError.unauthorized("Missing socket ticket");
  }
  const secret = options.secret ?? getEnv().JWT_SECRET;

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, secret, { audience: TICKET_AUDIENCE }) as jwt.JwtPayload;
  } catch {
    throw ApiError.unauthorized("Invalid or expired socket ticket");
  }

  if (
    !payload ||
    payload.typ !== "socket-ticket" ||
    typeof payload.sub !== "string" ||
    !payload.sub
  ) {
    throw ApiError.unauthorized("Invalid or expired socket ticket");
  }

  return { userId: payload.sub };
}
