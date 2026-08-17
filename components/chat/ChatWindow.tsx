"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";

interface ChatWindowProps {
  conversationId: string;
  otherUserName: string;
}

export default function ChatWindow({
  conversationId,
  otherUserName,
}: ChatWindowProps) {
  const currentUser = useAuthStore((s) => s.user);
  const openConversation = useChatStore((s) => s.openConversation);
  const closeConversation = useChatStore((s) => s.closeConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const messages =
    useChatStore((s) => s.messagesByConversation[conversationId]) ?? [];

  const [text, setText] = useState("");

  // Open on mount / when the conversation changes, close (unsubscribe) on
  // unmount — same subscribe/cleanup pattern from the room-tabs piece
  // earlier, just applied to a chat instead of a topic channel
  useEffect(() => {
    openConversation(conversationId);
    return () => closeConversation();
  }, [conversationId, openConversation, closeConversation]);

  async function handleSend() {
    if (!text.trim()) return;
    const content = text;
    setText("");
    try {
      await sendMessage(conversationId, content);
    } catch (err) {
      console.error("Failed to send message:", err);
      setText(content); // put it back so the user doesn't lose what they typed
    }
  }

  return (
    <div className="flex flex-col h-[70vh] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50">
        <p className="text-sm font-semibold text-slate-800">{otherUserName}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400 text-center mt-8">
            No messages yet — say hello
          </p>
        )}
        {messages.map((m) => {
          const isMine = m.senderId === currentUser?.id;
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  isMine
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        />
        <button
          onClick={handleSend}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3.5 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
