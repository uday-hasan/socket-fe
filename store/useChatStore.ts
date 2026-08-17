import { create } from "zustand";
import { useSocketStore } from "./useSocketStore";
import { fetcher } from "@/lib/fetcher"; // adjust to your actual fetcher path

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface ChatState {
  activeConversationId: string | null;
  messagesByConversation: Record<string, ChatMessage[]>;

  // Switches which conversation is "live" — subscribes to the new one's
  // channel, unsubscribes from whatever was open before, and loads history
  openConversation: (conversationId: string) => void;
  closeConversation: () => void;

  sendMessage: (conversationId: string, content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeConversationId: null,
  messagesByConversation: {},

  openConversation: (conversationId) => {
    const prev = get().activeConversationId;
    if (prev === conversationId) return;

    const { subscribe, unsubscribe } = useSocketStore.getState();
    if (prev) unsubscribe(`conversation:${prev}`);
    subscribe(`conversation:${conversationId}`);

    set({ activeConversationId: conversationId });

    // Load past messages via REST — the socket only delivers messages sent
    // WHILE you're connected and subscribed, never history from before
    fetcher<{ data: { messages: ChatMessage[] } }>(
      `/conversations/${conversationId}/messages`,
    )
      .then((res) => {
        set((state) => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: res.data.messages,
          },
        }));
      })
      .catch((err) => console.error("Failed to load message history:", err));
  },

  closeConversation: () => {
    const prev = get().activeConversationId;
    if (prev) useSocketStore.getState().unsubscribe(`conversation:${prev}`);
    set({ activeConversationId: null });
  },

  sendMessage: async (conversationId, content) => {
    // We do NOT append this message to local state here. It gets persisted
    // by the backend, then broadcast back to us over the "conversation:<id>"
    // channel exactly like every other subscriber receives it — including
    // ourselves. This keeps ONE source of truth for message order/content
    // instead of an optimistic local copy that could drift from the real one.
    await fetcher(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
}));

// Same pattern as notifications: a permanent listener on the ONE shared
// socket, routing chat events into the right conversation's message list
let lastSeenChatMessageId: string | null = null;

useSocketStore.subscribe((state) => {
  const latest = state.messages[0];
  if (!latest || latest.id === lastSeenChatMessageId) return;
  lastSeenChatMessageId = latest.id;

  const raw = latest.raw as {
    type?: string;
    channel?: string;
    payload?: ChatMessage;
  };

  if (
    raw.type !== "event" ||
    typeof raw.channel !== "string" ||
    !raw.channel.startsWith("conversation:")
  ) {
    return;
  }
  if (!raw.payload) return;

  const conversationId = raw.channel.replace("conversation:", "");

  useChatStore.setState((state) => {
    const existing = state.messagesByConversation[conversationId] ?? [];
    return {
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [...existing, raw.payload as ChatMessage],
      },
    };
  });
});
