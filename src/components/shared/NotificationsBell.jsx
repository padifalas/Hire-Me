import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Bell, X, CheckCheck } from "lucide-react";
import { useNotifications } from "../../contexts/notificationContext";
import useDialog from "../../hooks/useDialog";
import NotificationItem from "./NotificationItem";

import "./Notifications.css";

function BellPanel({ pinned, onClose, onOpenNotification, onViewAll }) {
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

  const [tab, setTab] = useState("unread");
  const [announce, setAnnounce] = useState("");
  const dialogRef = useDialog({ onClose });

  const unread = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications],
  );
  const read = useMemo(
    () => notifications.filter((n) => n.read),
    [notifications],
  );
  const visible = tab === "unread" ? unread : read;

  function handleOpen(notification) {
    if (!notification.read) setRead(notification.id, true);
    onClose();
    onOpenNotification(notification);
  }

  function handleOpenPinned(item) {
    onClose();
    item.onClick();
  }

  async function handleToggleRead(notification) {
    const next = !notification.read;
    await setRead(notification.id, next);
    setAnnounce(next ? "Marked as read." : "Marked as unread.");
  }

  async function handleDelete(notification) {
    await remove(notification.id);
    setAnnounce("Notification deleted.");
  }

  const showPinned = tab === "unread" && pinned.length > 0;
  const isEmpty = visible.length === 0 && !showPinned;

  return createPortal(
    <div
      className="ntf-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="ntf-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ntf-panel-title"
        tabIndex={-1}
      >
        <div className="ntf-panel__header">
          <h2 id="ntf-panel-title">Notifications</h2>
          <div className="ntf-panel__header-actions">
            <button
              type="button"
              className="ntf-text-btn"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck size={14} aria-hidden="true" /> Mark all read
            </button>
            <button
              type="button"
              className="ntf-icon-btn"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          className="ntf-tabs"
          role="group"
          aria-label="Filter notifications"
        >
          <button
            type="button"
            className={`ntf-tab${tab === "unread" ? " ntf-tab--active" : ""}`}
            aria-pressed={tab === "unread"}
            onClick={() => setTab("unread")}
          >
            Unread <span className="ntf-tab__count">{unread.length}</span>
          </button>
          <button
            type="button"
            className={`ntf-tab${tab === "read" ? " ntf-tab--active" : ""}`}
            aria-pressed={tab === "read"}
            onClick={() => setTab("read")}
          >
            Read <span className="ntf-tab__count">{read.length}</span>
          </button>
        </div>

        <div className="ntf-panel__body" aria-busy={loading}>
          <p className="sr-only" role="status" aria-live="polite">
            {announce}
          </p>

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

          {loading && notifications.length === 0 && (
            <p className="ntf-empty" role="status">
              Loading...
            </p>
          )}

          {!loading && !error && isEmpty && (
            <p className="ntf-empty">
              {tab === "unread"
                ? "You're all caught up."
                : "No read notifications yet."}
            </p>
          )}

          {(showPinned || visible.length > 0) && (
            <ul className="ntf-list">
              {showPinned &&
                pinned.map((item) => (
                  <NotificationItem
                    key={item.id}
                    notification={item}
                    pinned
                    compact
                    onOpen={() => handleOpenPinned(item)}
                  />
                ))}
              {visible.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  compact
                  onOpen={handleOpen}
                  onToggleRead={handleToggleRead}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="ntf-panel__footer">
          <button
            type="button"
            className="ntf-text-btn ntf-text-btn--block"
            onClick={() => {
              onClose();
              onViewAll();
            }}
          >
            See all notifications
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Drop-in replacement for the header bell on both dashboards.
 *
 * @param {string}   buttonClassName  existing bell button class (sd-bell-btn / ed-bell-btn)
 * @param {string}   badgeClassName   existing badge class (sd-bell-badge / ed-bell-badge)
 * @param {Array}    [pinned]         [{ id, type, title, body, onClick }] always-on "to do" items
 * @param {function} onOpenNotification (notification) => void - deep link
 * @param {function} onViewAll        () => void - go to the notifications page
 */
export default function NotificationBell({
  buttonClassName,
  badgeClassName,
  pinned = [],
  onOpenNotification,
  onViewAll,
}) {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  const label =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell size={16} color="#64748b" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className={badgeClassName} aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <BellPanel
          pinned={pinned}
          onClose={() => setOpen(false)}
          onOpenNotification={onOpenNotification}
          onViewAll={onViewAll}
        />
      )}
    </>
  );
}
