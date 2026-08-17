// components/UserList.tsx
"use client";

import { useEffect, useState } from "react";
import { getUsers, type ChatUser } from "@/lib/api";

interface UserListProps {
  selectedUserId: string | null;
  onSelect: (user: ChatUser) => void;
}

export function UserList({ selectedUserId, onSelect }: UserListProps) {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div className="p-4 text-sm text-gray-500">Loading users…</div>;
  if (error) return <div className="p-4 text-sm text-red-500">{error}</div>;

  return (
    <ul className="divide-y divide-gray-200">
      {users.map((user) => (
        <li key={user.id}>
          <button
            onClick={() => onSelect(user)}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
              selectedUserId === user.id ? "bg-gray-100" : ""
            }`}
          >
            <div className="font-medium text-sm">{user.name}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </button>
        </li>
      ))}
    </ul>
  );
}
