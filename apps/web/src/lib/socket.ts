import { io, type Socket } from "socket.io-client";
import { get } from "@/lib/api";

/**
 * Realtime client.
 *
 * Identity comes from a short-lived signed ticket fetched over the (cookie
 * authenticated) REST API — never from a query param the server has to trust.
 */
let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket | null> {
  if (socket?.connected) return socket;
  if (socket) {
    socket.connect();
    return socket;
  }

  try {
    const { ticket } = await get<{ ticket: string }>("/auth/socket-ticket");
    socket = io("/", {
      auth: { ticket },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 8000,
    });
    return socket;
  } catch {
    return null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
