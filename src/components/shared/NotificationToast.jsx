import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useNotifications } from "../../contexts/notificationContext";
import { notificationMeta } from "./NotificationItem";

import "./Notifications.css";

const AUTO_DISMISS_MS = 8000;

// Pops up when a NEW notification arrives while the dashboard is open (via
// the realtime subscription). It does not replay old unread ones on login -
// those are already visible as the bell badge.
export default function NotificationToast({ onOpenNotification }) {
  const { toast, dismissToast, setRead } = useNotifications();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!toast || paused) return;
    const t = setTimeout(dismissToast, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast, paused, dismissToast]);

  const notification = toast?.notification;
  const { Icon, tone } = notificationMeta(notification?.type);

  function handleOpen() {
    if (!notification) return;
    if (!notification.read) setRead(notification.id, true);
    dismissToast();
    onOpenNotification(notification);
  }

  return (
    <>
      {/* Always mounted so screen readers reliably announce new toasts */}
      <p className="sr-only" role="status" aria-live="polite">
        {notification
          ? `New notification: ${notification.title}. ${notification.body ?? ""}`
          : ""}
      </p>

      {notification && (
        <div
          className="ntf-toast"
          role="region"
          aria-label="New notification"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <button
            type="button"
            className="ntf-toast__main"
            onClick={handleOpen}
          >
            <span
              className={`ntf-item__icon ntf-item__icon--${tone}`}
              aria-hidden="true"
            >
              <Icon size={16} />
            </span>
            <span className="ntf-item__text">
              <span className="ntf-item__title">{notification.title}</span>
              {notification.body && (
                <span className="ntf-item__body">{notification.body}</span>
              )}
              {toast.extra > 0 && (
                <span className="ntf-toast__more">
                  +{toast.extra} more new notification
                  {toast.extra === 1 ? "" : "s"}
                </span>
              )}
            </span>
          </button>
          <button
            type="button"
            className="ntf-icon-btn"
            onClick={dismissToast}
            aria-label="Dismiss notification"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
