// Tabs on the notifications page. "This week" means the last 7 days
// (it includes today); "All" is there so nothing older than a week is
// unreachable now that there is no archive.
export const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "all", label: "All" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function inRange(notification, range) {
  if (range === "all") return true;
  const created = new Date(notification.created_at).getTime();
  if (Number.isNaN(created)) return false;
  if (range === "today") return created >= startOfToday();
  if (range === "week") return created >= Date.now() - 7 * DAY_MS;
  return true;
}

export function filterByRange(notifications, range) {
  return notifications.filter((n) => inRange(n, range));
}

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
