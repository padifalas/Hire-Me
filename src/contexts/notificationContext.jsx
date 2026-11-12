// One fetch + one realtime subscription for the signed-in user's
// notifications, shared by the bell panel, the toast, the notifications page
// and the student "Recent activity" card.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./authContext";
import {
  getNotifications,
  updateNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  subscribeToNotifications,
} from "../services/notificationService";

const NotificationsContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    );
  }
  return ctx;
}

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  // { notification, extra } - `extra` counts further arrivals while the toast
  // is still on screen ("+2 more")
  const [toast, setToast] = useState(null);

  // lets the realtime callback check for duplicates without re-subscribing
  const notificationsRef = useRef([]);
  notificationsRef.current = notifications;

  const refresh = useCallback(async () => {
    if (!userId) return;
    const result = await getNotifications(userId);
    if (result.success) {
      setNotifications(result.notifications);
      setError(null);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setToast(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getNotifications(userId).then((result) => {
      if (cancelled) return;
      if (result.success) setNotifications(result.notifications);
      else setError(result.error);
      setLoading(false);
    });

    const unsubscribe = subscribeToNotifications(userId, {
      onInsert: (row) => {
        if (!row || notificationsRef.current.some((n) => n.id === row.id))
          return;
        setNotifications((prev) => [row, ...prev]);
        setToast((prev) => ({
          notification: row,
          extra: prev ? prev.extra + 1 : 0,
        }));
      },
      onUpdate: (row) => {
        if (!row) return;
        setNotifications((prev) =>
          prev.map((n) => (n.id === row.id ? { ...n, ...row } : n)),
        );
      },
      onDelete: (id) => {
        if (!id) return;
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      },
    });

    // Catch anything missed while the tab was in the background.
    function handleVisibility() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId, refresh]);

  const setRead = useCallback(async (id, read) => {
    setActionError(null);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read } : n)),
    );

    const result = await updateNotificationRead(id, read);
    if (!result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: !read } : n)),
      );
      setActionError("Couldn't update this notification. Please try again.");
    }
    return result;
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return { success: false };
    setActionError(null);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    const result = await markAllNotificationsRead(userId);
    if (!result.success) {
      setActionError("Couldn't mark everything as read. Please try again.");
      refresh();
    }
    return result;
  }, [userId, refresh]);

  const remove = useCallback(
    async (id) => {
      setActionError(null);
      setNotifications((prev) => prev.filter((n) => n.id !== id));

      const result = await deleteNotification(id);
      if (!result.success) {
        setActionError("Couldn't delete this notification. Please try again.");
        refresh();
      }
      return result;
    },
    [refresh],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    actionError,
    toast,
    dismissToast,
    setRead,
    markAllRead,
    remove,
    refresh,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
