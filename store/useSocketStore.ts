import { create } from "zustand";

type ConnectionStatus = "connecting" | "open" | "closed" | "failed";

interface ReceivedMessage {
  id: string;
  raw: unknown;
  receivedAt: number;
}

interface SocketState {
  socket: WebSocket | null;
  status: ConnectionStatus;
  messages: ReceivedMessage[];

  connect: () => void;
  retry: () => void;

  // NEW — an intentional, permanent close (logout). Distinct from the
  // connection just dropping unexpectedly, which is what onclose normally
  // handles by scheduling a retry.
  disconnect: () => void;

  send: (message: unknown) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

// Point this at your actual backend port — matches the PORT your Express
// server + WS upgrade handler are running on (5000, based on your fetcher's
// BASE_URL), NOT the 8000 used in the earlier practice project.
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

let messageQueue: string[] = [];
const subscribedChannels = new Set<string>();

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;
let reconnectAttempts = 0;

// Set to true right before we intentionally close the connection ourselves
// (logout). onclose checks this flag to decide whether to schedule a
// reconnect at all — without it, logging out would immediately trigger a
// retry loop that keeps failing forever against a session that no longer
// exists, since the accessToken cookie was just cleared.
let intentionalClose = false;

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  status: "closed",
  messages: [],

  connect: () => {
    const existing = get().socket;
    if (existing && existing.readyState !== WebSocket.CLOSED) return;

    set({ status: "connecting" });

    // No token, no query param — the browser automatically attaches the
    // httpOnly accessToken cookie to this request because it's same-origin
    // (or configured via credentials on the CORS side), the exact same way
    // it would for any normal fetch(). This is genuinely automatic; there's
    // no equivalent of fetch's `credentials: "include"` needed for
    // WebSocket — cookie-matching rules apply the same way regardless.
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      set({ status: "open" });
      reconnectAttempts = 0;

      messageQueue.forEach((msg) => ws.send(msg));
      messageQueue = [];

      subscribedChannels.forEach((channel) => {
        ws.send(JSON.stringify({ type: "subscribe", channel }));
      });
    };

    ws.onmessage = (event: MessageEvent) => {
      const parsed = JSON.parse(event.data);
      const item: ReceivedMessage = {
        id: crypto.randomUUID(),
        raw: parsed,
        receivedAt: Date.now(),
      };
      set((state) => ({ messages: [item, ...state.messages] }));
    };

    ws.onclose = () => {
      set({ status: "closed", socket: null });

      // THE NEW CHECK. If we closed this ourselves (logout), stop here —
      // reset the flag and do NOT schedule a reconnect. Reconnecting after
      // an intentional logout would just hammer the auth gate with a
      // session that's gone, forever, at increasing but still-wasted
      // intervals.
      if (intentionalClose) {
        intentionalClose = false;
        return;
      }

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        set({ status: "failed" });
        console.log(`Gave up after ${MAX_RECONNECT_ATTEMPTS} failed attempts`);
        return;
      }

      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts),
        RECONNECT_MAX_DELAY_MS,
      );
      reconnectAttempts += 1;

      console.log(
        `Disconnected — retrying in ${delay / 1000}s (attempt ${reconnectAttempts})`,
      );
      setTimeout(() => get().connect(), delay);
    };

    set({ socket: ws });
  },

  retry: () => {
    reconnectAttempts = 0;
    get().connect();
  },

  disconnect: () => {
    const socket = get().socket;
    if (!socket) return;

    intentionalClose = true; // tell onclose not to schedule a retry
    socket.close();
    set({ socket: null, status: "closed" });

    // Clear remembered channel subscriptions too — logging back in as a
    // (possibly different) user shouldn't silently resubscribe to
    // whatever the PREVIOUS session happened to be watching
    subscribedChannels.clear();
  },

  send: (message: unknown) => {
    const json = JSON.stringify(message);
    const socket = get().socket;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(json);
    } else {
      messageQueue.push(json);
    }
  },

  subscribe: (channel: string) => {
    subscribedChannels.add(channel);
    get().send({ type: "subscribe", channel });
  },

  unsubscribe: (channel: string) => {
    subscribedChannels.delete(channel);
    get().send({ type: "unsubscribe", channel });
  },
}));
