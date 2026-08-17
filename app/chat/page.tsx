// app/chat/page.tsx
"use client";

import { useEffect, useState } from "react";

import type { ChatUser } from "@/lib/api";
import { useSocketStore } from "@/store/useSocketStore";
import { UserList } from "@/components/shared/UserSidebar";
import { ChatWindow } from "@/components/shared/ChatWindow";
import { useAuthStore } from "@/store/useAuthStore";

// Replace with however you actually get the logged-in user's id
// (e.g. a useAuth() hook, a /me query, decoded from context, etc.)
declare function useCurrentUser(): { id: string } | null;

export default function ChatPage() {
  const { user: currentUser } = useAuthStore();
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const connect = useSocketStore((s) => s.connect);

  useEffect(() => {
    connect();
  }, [connect]);

  if (!currentUser) return <div>Loading…</div>;

  return (
    <div className="flex h-screen">
      <aside className="w-72 border-r overflow-y-auto">
        <UserList
          selectedUserId={selectedUser?.id ?? null}
          onSelect={setSelectedUser}
        />
      </aside>
      <main className="flex-1">
        {selectedUser ? (
          <ChatWindow currentUserId={currentUser.id} otherUser={selectedUser} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a user to start chatting
          </div>
        )}
      </main>
    </div>
  );
}
