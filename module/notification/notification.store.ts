// import { create } from "zustand";

// type ConnectionStatus = "connecting" | "open" | "closed";

// // Matches what your backend's notifyAll() actually sends:
// // { type: "notification", payload: { message: "..." } }
// interface NotificationItem {
//   id: string; // generated on the client — your backend doesn't send one
//   message: string;
//   receivedAt: number;
// }

// interface NotificationState {
//   socket: WebSocket | null;
//   status: ConnectionStatus;

//   // Every notification we've ever received this session, newest first
//   notifications: NotificationItem[];

//   // How many the user hasn't looked at yet — drives the badge on the bell
//   unreadCount: number;

//   connect: () => void;

//   // Called when the bell dropdown is opened — clears the unread badge
//   // without deleting the notifications themselves
//   markAllAsRead: () => void;
// }

// const RECONNECT_DELAY_MS = 3000;

// export const useNotificationStore = create<NotificationState>((set, get) => ({
//   socket: null,
//   status: "closed",
//   notifications: [],
//   unreadCount: 0,

//   connect: () => {
//     // If we already have a socket that isn't fully closed, don't open a
//     // second one. Because this store is a singleton (Zustand), this check
//     // means it's safe to call connect() from anywhere without worrying
//     // about creating duplicate connections.
//     const existing = get().socket;
//     if (existing && existing.readyState !== WebSocket.CLOSED) return;

//     set({ status: "connecting" });

//     // Matches the `path: "/ws"` your backend's WebSocketServer was
//     // configured with — this has to match exactly or the upgrade request
//     // never reaches your server.on("upgrade") listener at all.
//     const ws = new WebSocket("ws://localhost:8000/ws");

//     ws.onopen = () => {
//       set({ status: "open" });
//       console.log("Connected");
//       // No re-subscribe step needed here — unlike the channel version,
//       // there's nothing to "remember" and replay. Every connected client
//       // automatically gets every notification, with zero setup required.
//     };

//     // Runs every time the server sends ANYTHING. Your backend currently
//     // only ever sends two shapes: { type: "welcome", ... } on connect,
//     // and { type: "notification", payload: {...} } from notifyAll().
//     ws.onmessage = (event: MessageEvent) => {
//       const message = JSON.parse(event.data);

//       if (message.type === "notification") {
//         const item: NotificationItem = {
//           id: crypto.randomUUID(), // client-generated, just needs to be unique for React's key prop
//           message: message.payload?.message ?? "New notification",
//           receivedAt: Date.now(),
//         };

//         set((state) => ({
//           // Newest first — prepend rather than append
//           notifications: [item, ...state.notifications],
//           unreadCount: state.unreadCount + 1,
//         }));
//       }
//       // "welcome" and "error" messages are ignored here — nothing to
//       // display for those in this simple version
//     };

//     ws.onclose = () => {
//       set({ status: "closed", socket: null });
//       console.log("Disconnected — retrying in 3s");

//       // Same reconnect pattern as before: try again in 3 seconds.
//       // get().connect() (not `connect` directly) always calls the
//       // CURRENT version of this function through the store.
//       setTimeout(() => get().connect(), RECONNECT_DELAY_MS);
//     };

//     set({ socket: ws });
//   },

//   markAllAsRead: () => {
//     set({ unreadCount: 0 });
//   },
// }));

import { create } from "zustand";

type ConnectionStatus = "connecting" | "open" | "closed";

// Matches what your backend's notifyAll() actually sends:
// { type: "notification", payload: { message: "..." } }
interface NotificationItem {
  id: string; // generated on the client — your backend doesn't send one
  message: string;
  receivedAt: number;
}

interface NotificationState {
  socket: WebSocket | null;
  status: ConnectionStatus;

  // Every notification we've ever received this session, newest first
  notifications: NotificationItem[];

  // How many the user hasn't looked at yet — drives the badge on the bell
  unreadCount: number;

  connect: () => void;

  // Called when the bell dropdown is opened — clears the unread badge
  // without deleting the notifications themselves
  markAllAsRead: () => void;
}

const RECONNECT_DELAY_MS = 3000;

// Generates a short two-tone chime using the Web Audio API — no audio file
// needed. Browsers only allow audio to play AFTER the user has interacted
// with the page at least once (click, keypress, etc.) — this is a browser
// autoplay policy, not a bug. If the very first notification arrives before
// any interaction, the sound will silently fail; every one after a click
// works fine.
function playNotificationSound(): void {
  try {
    const ctx = new AudioContext();

    // Plays one short tone at a given frequency, starting `startTime`
    // seconds from now and lasting `duration` seconds
    function playTone(frequency: number, startTime: number, duration: number) {
      const oscillator = ctx.createOscillator(); // generates the raw tone
      const gain = ctx.createGain(); // controls volume, and lets us fade out

      oscillator.type = "sine"; // smooth tone, not harsh/buzzy
      oscillator.frequency.value = frequency;

      oscillator.connect(gain);
      gain.connect(ctx.destination); // destination = your speakers

      const now = ctx.currentTime + startTime;

      // Fade in quickly, hold, then fade out — avoids an abrupt "click"
      // sound at the start/end that a raw on/off tone would produce
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.01); // keep it quiet
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    }

    // Two quick notes make it read as a "ding-dong" chime rather than a beep
    playTone(880, 0, 0.12); // A5
    playTone(1320, 0.1, 0.18); // E6, starts slightly before the first ends
  } catch {
    // AudioContext can throw in some restricted environments — a missing
    // sound is not worth crashing the notification flow over
    console.warn("Could not play notification sound");
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  socket: null,
  status: "closed",
  notifications: [],
  unreadCount: 0,

  connect: () => {
    // If we already have a socket that isn't fully closed, don't open a
    // second one. Because this store is a singleton (Zustand), this check
    // means it's safe to call connect() from anywhere without worrying
    // about creating duplicate connections.
    const existing = get().socket;
    if (existing && existing.readyState !== WebSocket.CLOSED) return;

    set({ status: "connecting" });

    // Matches the `path: "/ws"` your backend's WebSocketServer was
    // configured with — this has to match exactly or the upgrade request
    // never reaches your server.on("upgrade") listener at all.
    const ws = new WebSocket("ws://localhost:8000/ws");

    ws.onopen = () => {
      set({ status: "open" });
      console.log("Connected");
      // No re-subscribe step needed here — unlike the channel version,
      // there's nothing to "remember" and replay. Every connected client
      // automatically gets every notification, with zero setup required.
    };

    // Runs every time the server sends ANYTHING. Your backend currently
    // only ever sends two shapes: { type: "welcome", ... } on connect,
    // and { type: "notification", payload: {...} } from notifyAll().
    ws.onmessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      if (message.type === "notification") {
        const item: NotificationItem = {
          id: crypto.randomUUID(), // client-generated, just needs to be unique for React's key prop
          message: message.payload?.message ?? "New notification",
          receivedAt: Date.now(),
        };

        playNotificationSound();

        set((state) => ({
          // Newest first — prepend rather than append
          notifications: [item, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      }
      // "welcome" and "error" messages are ignored here — nothing to
      // display for those in this simple version
    };

    ws.onclose = () => {
      set({ status: "closed", socket: null });
      console.log("Disconnected — retrying in 3s");

      // Same reconnect pattern as before: try again in 3 seconds.
      // get().connect() (not `connect` directly) always calls the
      // CURRENT version of this function through the store.
      setTimeout(() => get().connect(), RECONNECT_DELAY_MS);
    };

    set({ socket: ws });
  },

  markAllAsRead: () => {
    set({ unreadCount: 0 });
  },
}));
