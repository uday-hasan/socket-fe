import { create } from "zustand";
import { useSocketStore } from "./useSocketStore";

interface NotificationItem {
  id: string;
  message: string;
  receivedAt: number;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllAsRead: () => void;
}

function playNotificationSound(): void {
  try {
    const ctx = new AudioContext();
    function playTone(frequency: number, startTime: number, duration: number) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime + startTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.start(now);
      oscillator.stop(now + duration);
    }
    playTone(880, 0, 0.12);
    playTone(1320, 0.1, 0.18);
  } catch {
    console.warn("Could not play notification sound");
  }
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  markAllAsRead: () => set({ unreadCount: 0 }),
}));

// THIS is the fix compared to before. Instead of this store owning its own
// `new WebSocket(...)`, it subscribes to the ALREADY-EXISTING shared
// socketStore and reacts to messages that look like notifications. This
// code runs once, at module load — a permanent listener on the one real
// connection, not a second connection of its own.
let lastSeenMessageId: string | null = null;

useSocketStore.subscribe((state) => {
  const latest = state.messages[0];
  if (!latest || latest.id === lastSeenMessageId) return;
  lastSeenMessageId = latest.id;

  const raw = latest.raw as {
    type?: string;
    payload?: { message?: string };
    channel?: string;
  };

  // Two message shapes count as "a notification" now that auth is in the
  // picture: a plain global broadcast (old system), or an "event" arriving
  // on this user's own personal channel (new — see socketManager's
  // auto-subscribe to user:<id>)
  const isGlobalNotification = raw.type === "notification";
  const isPersonalEvent =
    raw.type === "notification" &&
    typeof raw.channel === "string" &&
    raw.channel.startsWith("user:");

  if (!isGlobalNotification && !isPersonalEvent) return;

  // Both shapes carry the actual content under `payload` — matches your
  // real backend's broadcastToChannel(channel, payload) exactly
  const text = raw.payload?.message ?? "New notification";

  playNotificationSound();

  useNotificationStore.setState((state) => ({
    notifications: [
      { id: crypto.randomUUID(), message: text, receivedAt: Date.now() },
      ...state.notifications,
    ],
    unreadCount: state.unreadCount + 1,
  }));
});
