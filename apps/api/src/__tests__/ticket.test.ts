import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { ApiError } from "../lib/errors.js";
import { generateTicket, TICKET_AUDIENCE, verifyTicket } from "../modules/auth/ticket.js";

const SECRET = "unit-test-secret-unit-test-secret-32ch";
const OTHER_SECRET = "a-completely-different-secret-value-32";
const USER_ID = "64b000000000000000000001";

function expectUnauthorized(fn: () => unknown): ApiError {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ApiError);
  const apiError = caught as ApiError;
  expect(apiError.status).toBe(401);
  expect(apiError.code).toBe("UNAUTHORIZED");
  return apiError;
}

describe("socket tickets", () => {
  it("round-trips the user id", () => {
    const ticket = generateTicket(USER_ID, { secret: SECRET, ttlSeconds: 60 });
    expect(verifyTicket(ticket, { secret: SECRET }).userId).toBe(USER_ID);
  });

  it("issues a short-lived ticket", () => {
    const ticket = generateTicket(USER_ID, { secret: SECRET, ttlSeconds: 60 });
    const payload = jwt.verify(ticket, SECRET) as jwt.JwtPayload;
    expect(payload.exp! - payload.iat!).toBe(60);
    expect(payload.aud).toBe(TICKET_AUDIENCE);
    expect(payload.typ).toBe("socket-ticket");
    expect(payload.sub).toBe(USER_ID);
  });

  it("rejects an expired ticket", () => {
    const expired = jwt.sign(
      {
        sub: USER_ID,
        typ: "socket-ticket",
        aud: TICKET_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) - 30,
      },
      SECRET,
    );
    expectUnauthorized(() => verifyTicket(expired, { secret: SECRET }));
  });

  it("rejects a tampered ticket", () => {
    const ticket = generateTicket(USER_ID, { secret: SECRET, ttlSeconds: 60 });
    const tampered = `${ticket.slice(0, -3)}xyz`;
    expectUnauthorized(() => verifyTicket(tampered, { secret: SECRET }));
  });

  it("rejects a ticket signed with another secret", () => {
    const forged = generateTicket("64b000000000000000000002", {
      secret: OTHER_SECRET,
      ttlSeconds: 60,
    });
    expectUnauthorized(() => verifyTicket(forged, { secret: SECRET }));
  });

  it("rejects a session token used as a socket ticket", () => {
    const session = jwt.sign({ sub: USER_ID, typ: "session" }, SECRET, {
      expiresIn: "1d",
      audience: TICKET_AUDIENCE,
    });
    expectUnauthorized(() => verifyTicket(session, { secret: SECRET }));
  });

  it("rejects a ticket without the socket-ticket audience", () => {
    const noAudience = jwt.sign({ sub: USER_ID, typ: "socket-ticket" }, SECRET, { expiresIn: 60 });
    expectUnauthorized(() => verifyTicket(noAudience, { secret: SECRET }));
  });

  it("rejects missing or non-string tickets", () => {
    expectUnauthorized(() => verifyTicket(undefined, { secret: SECRET }));
    expectUnauthorized(() => verifyTicket("", { secret: SECRET }));
    expectUnauthorized(() => verifyTicket(12345, { secret: SECRET }));
    expectUnauthorized(() => verifyTicket({ ticket: "x" }, { secret: SECRET }));
  });
});
