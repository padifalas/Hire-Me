import {
  Bell,
  ClipboardList,
  UserPlus,
  Sparkles,
  Mail,
  MailOpen,
  Trash2,
} from "lucide-react";
import { timeAgo } from "../../utils/notificationUtils";

const TYPE_META = {
  application_status: { Icon: ClipboardList, tone: "violet" },
  new_application: { Icon: UserPlus, tone: "mint" },
  profile_incomplete: { Icon: Sparkles, tone: "orange" },
};
const DEFAULT_META = { Icon: Bell, tone: "grey" };

export function notificationMeta(type) {
  return TYPE_META[type] ?? DEFAULT_META;
}

/**
 * @param {object}   notification  row from `notifications` (or a pinned item)
 * @param {function} onOpen        called with the notification when the row is activated
 * @param {function} [onToggleRead] (notification) => void - omit to hide the button
 * @param {function} [onDelete]     (notification) => void - omit to hide the button
 * @param {boolean}  [compact]     tighter layout for the bell panel
 * @param {boolean}  [pinned]      pinned "to do" item: no time, no actions
 */
export default function NotificationItem({
  notification,
  onOpen,
  onToggleRead,
  onDelete,
  compact = false,
  pinned = false,
}) {
  const { Icon, tone } = notificationMeta(notification.type);
  const unread = !pinned && !notification.read;
  const hasActions = !pinned && (onToggleRead || onDelete);

  return (
    <li
      className={`ntf-item${unread ? " ntf-item--unread" : ""}${compact ? " ntf-item--compact" : ""}${pinned ? " ntf-item--pinned" : ""}`}
    >
      <button
        type="button"
        className="ntf-item__main"
        onClick={() => onOpen(notification)}
      >
        <span
          className={`ntf-item__icon ntf-item__icon--${tone}`}
          aria-hidden="true"
        >
          <Icon size={16} />
        </span>

        <span className="ntf-item__text">
          <span className="ntf-item__title">
            {unread && <span className="sr-only">Unread: </span>}
            {notification.title}
          </span>
          {notification.body && (
            <span className="ntf-item__body">{notification.body}</span>
          )}
          {!pinned && (
            <span className="ntf-item__time">
              {timeAgo(notification.created_at)}
            </span>
          )}
        </span>

        {unread && <span className="ntf-item__dot" aria-hidden="true" />}
      </button>

      {hasActions && (
        <div className="ntf-item__actions">
          {onToggleRead && (
            <button
              type="button"
              className="ntf-icon-btn"
              onClick={() => onToggleRead(notification)}
              aria-label={
                notification.read
                  ? `Mark as unread: ${notification.title}`
                  : `Mark as read: ${notification.title}`
              }
              title={notification.read ? "Mark as unread" : "Mark as read"}
            >
              {notification.read ? (
                <Mail size={14} aria-hidden="true" />
              ) : (
                <MailOpen size={14} aria-hidden="true" />
              )}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="ntf-icon-btn ntf-icon-btn--danger"
              onClick={() => onDelete(notification)}
              aria-label={`Delete notification: ${notification.title}`}
              title="Delete"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
