// lib/api.ts
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export async function getUsers(): Promise<ChatUser[]> {
  const res = await fetch(`${BASE_URL}/auth/users`, {
    credentials: "include", // sends the httpOnly accessToken cookie
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  const json = await res.json();
  return json.data; // matches your sendResponse shape { data, message, ... }
}

export interface DMRecord {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
}

export async function getConversation(
  otherUserId: string,
  before?: string,
): Promise<DMRecord[]> {
  const url = new URL(`${BASE_URL}/messages/${otherUserId}`);
  if (before) url.searchParams.set("before", before);
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch conversation");
  const json = await res.json();
  return json.data;
}
