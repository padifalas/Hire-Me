import { MessageSquareText, ExternalLink } from "lucide-react";
import SkillTag from "./SkillTag.jsx";
import "./FeedbackFromEmployer.css";

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/*
  Matches the output of the generate-rejection-feedback Edge Function:

    <message paragraph(s)>

    Free resources to help close the gap:
    - skillA: [Title 1](url1), [Title 2](url2)
    - skillB: [Title 3](url3)

  Returns the message and the resources grouped by skill.
*/
export function parseFeedback(text) {
  const heading = text.match(/free resources[^:\n]*:/i);
  if (!heading) return { intro: text.trim(), groups: [] };

  const intro = text.slice(0, heading.index).trim();
  const block = text.slice(heading.index + heading[0].length);

  const bySkill = new Map();
  const linePattern = /^-\s*([^:\n]+):\s*(.+)$/gm;
  let line;
  while ((line = linePattern.exec(block)) !== null) {
    const skill = line[1].trim();
    const links = bySkill.get(skill) ?? [];
    const linkPattern = new RegExp(LINK.source, "g");
    let link;
    while ((link = linkPattern.exec(line[2])) !== null) {
      links.push({ title: link[1], url: link[2] });
    }
    if (links.length) bySkill.set(skill, links);
  }

  return {
    intro,
    groups: [...bySkill.entries()].map(([skill, links]) => ({ skill, links })),
  };
}

// Inline [text](url) links inside the message itself
function renderInline(text) {
  const parts = [];
  const pattern = new RegExp(LINK.source, "g");
  let last = 0;
  let match;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <a
        key={key++}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="fb-inline-link"
      >
        {match[1]}
      </a>,
    );
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function FeedbackFromEmployer({ text, company }) {
  if (!text?.trim()) return null;

  const { intro, groups } = parseFeedback(text);
  const paragraphs = intro.split(/\n{2,}/).filter(Boolean);
  const title = company ? `Feedback from ${company}` : "Feedback from the employer";

  return (
    <section className="fb-card" aria-label={title}>
      <header className="fb-card__header">
        <span className="fb-card__icon" aria-hidden="true">
          <MessageSquareText size={16} />
        </span>
        <div>
          <h4 className="fb-card__title">{title}</h4>
          <p className="fb-card__meta">
            Reviewed and sent by the employer. May include AI-drafted
            suggestions.
          </p>
        </div>
      </header>

      <div className="fb-card__body">
        {paragraphs.map((p, i) => (
          <p key={i}>{renderInline(p)}</p>
        ))}
      </div>

      {groups.length > 0 && (
        <div className="fb-card__resources">
          <h5 className="fb-card__resources-title">
            Free resources to close the gap
          </h5>
          <ul className="fb-card__list">
            {groups.map((g) => (
              <li key={g.skill} className="fb-card__row">
                <span className="fb-card__skill">
                  <SkillTag label={g.skill} variant="missing" small />
                </span>
                <span className="fb-card__links">
                  {g.links.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fb-link"
                    >
                      {l.title}
                      <ExternalLink size={12} aria-hidden="true" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
