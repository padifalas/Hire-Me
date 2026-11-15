import "./skill-tags.css";

const LEVELS = { beginner: 1, intermediate: 2, advanced: 3 };

export function levelToPips(level) {
  return LEVELS[String(level ?? "").toLowerCase()] ?? 0;
}

/** threee dots, filled up to the skill level */
export function LevelPips({ level }) {
  const on = levelToPips(level);
  if (!on) return null;
  return (
    <span className="hm-pips" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`hm-pip${n <= on ? " hm-pip--on" : ""}`} />
      ))}
    </span>
  );
}

/**
 * variant: technical .. soft .. domain..  matched ... missing .. nice
 * level:   beginner / intermediate / advanced 
 */
export default function SkillTag({
  label,
  variant = "technical",
  level,
  title,
  small = false,
}) {
  return (
    <span
      className={`hm-tag hm-tag--${variant}${small ? " hm-tag--sm" : ""}`}
      title={title}
    >
      {label}
      {levelToPips(level) > 0 && (
        <>
          <LevelPips level={level} />
          <span className="sr-only"> ({level})</span>
        </>
      )}
    </span>
  );
}
