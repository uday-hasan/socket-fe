"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useSocketStore } from "@/store/useSocketStore";

const NAV_LINKS = ["Home", "Messages"];

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { connect, status } = useSocketStore((s) => s);

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  const [open, setOpen] = useState(false);

  function toggleDropdown() {
    setOpen((prev) => !prev);
    if (!open) markAllAsRead();
  }

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b bg-white relative">
      <div className="flex gap-6">
        {NAV_LINKS.map((link) => (
          <a
            key={link}
            href="#"
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            {link}
          </a>
        ))}
      </div>

      <div className={`font-bold text-amber-500 text-lg`}>{status}</div>

      <div className="flex items-center gap-4">
        {user && <span className="text-sm text-slate-500">{user.name}</span>}

        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="relative p-2 rounded-full hover:bg-slate-100"
          >
            <Bell className="w-5 h-5 text-slate-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto z-10">
              <div className="p-3 border-b font-semibold text-sm text-slate-700">
                Notifications
              </div>
              {notifications.length === 0 && (
                <p className="p-4 text-sm text-slate-400">
                  No notifications yet
                </p>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 border-b last:border-none text-sm"
                >
                  <p className="text-slate-800">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.receivedAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {user && (
          <button
            onClick={logout}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </nav>
  );
}
