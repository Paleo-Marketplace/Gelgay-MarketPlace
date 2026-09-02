'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  X,
  CheckCircle2,
  ShieldCheck,
  Truck,
  DollarSign,
  AlertTriangle,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../app/stores/useAuthStore';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl?: string;
}

export default function NotificationDrawer({
  isOpen,
  onClose,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}: NotificationDrawerProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/notifications`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${apiUrl}/api/notifications/read-all`, {
        method: 'POST',
        credentials: 'include'
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${apiUrl}/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include'
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {}
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, apiUrl]);

  // Socket.io Real-Time Alerts
  useEffect(() => {
    const socket = io(apiUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socket.on('notification:new', (newNotification: any) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [apiUrl]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'escrow':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'courier':
      case 'order':
        return <Truck className="w-4 h-4 text-sky-600" />;
      case 'payout':
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      case 'review':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      default:
        return <Info className="w-4 h-4 text-[#C85A32]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div
        className="absolute inset-0 bg-[#1F1E1B]/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF8F5] border-l border-[#E2DDD3] shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-6 border-b border-[#E8E4DC] flex items-center justify-between bg-[#FAF8F5]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1F1E1B] text-white flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1F1E1B]">
                  Activity & Alerts
                </h3>
                <p className="font-mono text-xs text-[#7C776E]">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-2.5 py-1 text-[11px] font-mono text-[#C85A32] hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-[#7C776E] hover:text-[#1F1E1B] hover:bg-[#E8E4DC]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {!isAuthenticated ? (
              <div className="p-8 text-center bg-white border border-[#E2DDD3] rounded-2xl space-y-3">
                <ShieldCheck className="w-8 h-8 text-[#C85A32] mx-auto" />
                <p className="font-serif text-base text-[#1F1E1B]">Sign in to view alerts</p>
                <p className="font-sans text-xs text-[#625D54]">
                  Escrow deposits, courier handoffs, and seller payouts will appear here in real time.
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#E2DDD3] rounded-2xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-serif text-base text-[#1F1E1B]">You're all caught up!</p>
                <p className="font-sans text-xs text-[#625D54]">
                  No new escrow or order updates at this moment.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id || n.id || Math.random()}
                  onClick={() => markAsRead(n._id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    !n.read
                      ? 'bg-white border-[#C85A32]/40 shadow-xs'
                      : 'bg-white/70 border-[#E2DDD3] opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E2DDD3] shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-serif text-sm font-bold text-[#1F1E1B] truncate">
                          {n.title}
                        </h4>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[#C85A32] shrink-0" />
                        )}
                      </div>
                      <p className="font-sans text-xs text-[#625D54] mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E4DC]/60 font-mono text-[10px] text-[#7C776E]">
                        <span>{new Date(n.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={onClose}
                            className="text-[#C85A32] font-semibold hover:underline"
                          >
                            View details →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
