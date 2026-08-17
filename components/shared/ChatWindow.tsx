// components/ChatWindow.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getConversation, type ChatUser, type DMRecord } from "@/lib/api";
import { useSocketStore } from "@/store/useSocketStore";

interface ChatWindowProps {
  currentUserId: string;
  otherUser: ChatUser;
}

export function ChatWindow({ currentUserId, otherUser }: ChatWindowProps) {
  const [history, setHistory] = useState<DMRecord[]>([]);
  const [text, setText] = useState("");
  const liveMessages = useSocketStore((s) => s.messages);
  const send = useSocketStore((s) => s.send);
  const status = useSocketStore((s) => s.status);

  // Load past messages whenever the selected conversation changes
  useEffect(() => {
    getConversation(otherUser.id).then((data) => {
      setHistory(data.reverse()); // API returns desc; we want asc for display
    });
  }, [otherUser.id]);

  // Pull just this conversation's DMs out of the live socket feed
  const liveForThisChat = useMemo(() => {
    return liveMessages
      .filter((m) => {
        const raw = m.raw as any;
        if (raw?.channel?.startsWith("user:") !== true) return false;
        const dm: DMRecord | undefined = raw?.payload?.message;
        if (!dm) return false;
        return (
          (dm.senderId === currentUserId && dm.recipientId === otherUser.id) ||
          (dm.senderId === otherUser.id && dm.recipientId === currentUserId)
        );
      })
      .map((m) => (m.raw as any).payload.message as DMRecord)
      .reverse(); // liveMessages is newest-first (unshifted); flip to chronological
  }, [liveMessages, currentUserId, otherUser.id]);

  // Merge, de-dupe by id (history + live can overlap right after sending)
  const allMessages = useMemo(() => {
    const map = new Map<string, DMRecord>();
    [...history, ...liveForThisChat].forEach((m) => map.set(m.id, m));
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [history, liveForThisChat]);

  const handleSend = () => {
    if (!text.trim()) return;
    send({ type: "dm", to: otherUser.id, text: text.trim() });
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b font-medium flex items-center justify-between">
        <span>{otherUser.name}</span>
        <span
          className={`text-xs ${status === "open" ? "text-green-600" : "text-gray-400"}`}
        >
          {status}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {allMessages.map((m) => (
          <div
            key={m.id}
            className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
              m.senderId === currentUserId
                ? "ml-auto bg-blue-600 text-white"
                : "mr-auto bg-gray-200 text-gray-900"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message…"
          className="flex-1 border rounded-full px-4 py-2 text-sm outline-none"
        />
        <button
          onClick={handleSend}
          disabled={status !== "open"}
          className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
