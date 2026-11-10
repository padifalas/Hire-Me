// Returns a colour based on a match score.
export function matchColor(score) {
  if (score === null || score === undefined) return "#64748b";
  if (score >= 75) return "#15803D";
  if (score >= 50) return "#B45309";
  return "#B91C1C";
}

const AVATAR_PALETTE = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#cffafe", color: "#0e7490" },
  { bg: "#dcfce7", color: "#15803d" },
  { bg: "#fef3c7", color: "#b45309" },
];

// Assigns a consistent background and text colour to an avatar.
export function avatarStyleFor(id) {
  const hash = String(id ?? "")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// Takes someone's name and converts it into initials.
export function getInitials(name, fallback = "S") {
  if (!name) return fallback;
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
