import { useMemo, useRef, useState } from "react";
import { CheckCheck, BellOff } from "lucide-react";
import { useNotifications } from "../../contexts/notificationContext";
import NotificationItem from "./NotificationItem";
import { RANGES, filterByRange } from "../../utils/notificationUtils";

import "./Notifications.css";

const EMPTY_COPY = {
  today: "Nothing new today.",
  week: "No notifications in the last 7 days.",
  all: "You don't have any notifications yet.",
};

export default function NotificationsView({ onOpenNotification }) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    actionError,
    setRead,
    markAllRead,
    remove,
  } = useNotifications();

  const [range, setRange] = useState("today");
  const [announce, setAnnounce] = useState("");
  const titleRef = useRef(null);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        RANGES.map((r) => [r.key, filterByRange(notifications, r.key).length]),
      ),
    [notifications],
  );
  const visible = useMemo(
    () => filterByRange(notifications, range),
    [notifications, range],
  );

  function handleOpen(notification) {
    if (!notification.read) setRead(notification.id, true);
    onOpenNotification(notification);
  }

  async function handleToggleRead(notification) {
    const next = !notification.read;
    await setRead(notification.id, next);
    setAnnounce(next ? "Marked as read." : "Marked as unread.");
  }

  async function handleDelete(notification) {
    await remove(notification.id);
    setAnnounce("Notification deleted.");
    titleRef.current?.focus();
  }

  return (
    <div className="ntf-page">
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      <div className="ntf-page__header">
        <div>
          <h1 className="ntf-page__title" ref={titleRef} tabIndex={-1}>
            Notifications
          </h1>
          <p className="ntf-page__subtitle" role="status">
            {loading
              ? "Loading..."
              : unreadCount > 0
                ? `${unreadCount} unread ${unreadCount === 1 ? "update" : "updates"}`
                : "You're all caught up"}
          </p>
        </div>

        <button
          type="button"
          className="ntf-outline-btn"
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck size={14} aria-hidden="true" /> Mark all as read
        </button>
      </div>

      <div
        className="ntf-tabs ntf-tabs--page"
        role="group"
        aria-label="Filter by date"
      >
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`ntf-tab${range === r.key ? " ntf-tab--active" : ""}`}
            aria-pressed={range === r.key}
            onClick={() => setRange(r.key)}
          >
            {r.label} <span className="ntf-tab__count">{counts[r.key]}</span>
          </button>
        ))}
      </div>

      {error && (
        <p className="ntf-error" role="alert">
          Couldn't load notifications: {error}
        </p>
      )}
      {actionError && (
        <p className="ntf-error" role="alert">
          {actionError}
        </p>
      )}

      <div className="ntf-card" aria-busy={loading}>
        {!loading && !error && visible.length === 0 && (
          <div className="ntf-empty ntf-empty--page">
            <BellOff size={28} strokeWidth={1.5} aria-hidden="true" />
            <p>{EMPTY_COPY[range]}</p>
          </div>
        )}

        {visible.length > 0 && (
          <ul className="ntf-list">
            {visible.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onOpen={handleOpen}
                onToggleRead={handleToggleRead}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
