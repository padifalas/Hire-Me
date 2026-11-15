import { useState } from "react";
import { FolderOpen } from "lucide-react";
import SkillTag, { LevelPips } from "../shared/SkillTag.jsx";
import "./ProfileResults.css";

const LEVEL_RANK = { advanced: 0, intermediate: 1, beginner: 2 };
const rank = (level) => LEVEL_RANK[String(level ?? "").toLowerCase()] ?? 3;

// gon remove blanks and case-insensitive duplicates; accept strings or {skill, ...}
function uniqueSkills(list) {
  const seen = new Set();
  const out = [];
  for (const item of list ?? []) {
    const skill = typeof item === "string" ? { skill: item } : item;
    const name = String(skill?.skill ?? "").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...skill, skill: name });
  }
  return out;
}

function SectionHeading({ id, title, count, children }) {
  return (
    <div className="pr-heading">
      <h3 className="pr-heading__title" id={id}>
        {title}
        {count > 0 && <span className="pr-count">{count}</span>}
      </h3>
      {children}
    </div>
  );
}

function ProjectCard({ project }) {
  const [open, setOpen] = useState(false);
  const description = project.description ?? "";
  const isLong = description.length > 170;
  const skills = uniqueSkills(project.skills_demonstrated);

  return (
    <article className="pr-project">
      <header className="pr-project__head">
        <span className="pr-project__icon" aria-hidden="true">
          <FolderOpen size={16} />
        </span>
        <div className="pr-project__titles">
          <h4 className="pr-project__title">{project.professional_title}</h4>
          {project.original_title && (
            <p className="pr-project__original">
              Originally: {project.original_title}
            </p>
          )}
        </div>
      </header>

      {description && (
        <div className="pr-project__body">
          <p
            className={`pr-project__desc${isLong && !open ? " pr-project__desc--clamped" : ""}`}
          >
            {description}
          </p>
          {isLong && (
            <button
              type="button"
              className="pr-project__toggle"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              {open ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {skills.length > 0 && (
        <footer className="pr-project__tags">
          {skills.map((s) => (
            <SkillTag key={s.skill} label={s.skill} variant="technical" small />
          ))}
        </footer>
      )}
    </article>
  );
}

export default function ProfileResults({ profile }) {
  const technical = uniqueSkills(profile.extracted_technical_skills).sort(
    (a, b) => rank(a.level) - rank(b.level),
  );
  const soft = uniqueSkills(profile.extracted_soft_skills);
  const experience = (profile.extracted_experience ?? []).filter(
    (e) => e?.title || e?.organization,
  );
  const projects = profile.translated_projects ?? [];

  const analysed = profile.ai_processed_at
    ? new Date(profile.ai_processed_at).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <section className="pr-root" aria-labelledby="pr-title">
      <div className="pr-intro">
        <h2 className="pr-title" id="pr-title">
          Your AI-generated profile
        </h2>
        <p className="pr-intro__text">
          Built from your CV and transcript{analysed ? ` on ${analysed}` : ""}.
          Employers see this version, so re-run the analysis after you update
          either file.
        </p>
      </div>

      {profile.professional_summary && (
        <div className="pr-summary">
          <p className="pr-summary__text">{profile.professional_summary}</p>
        </div>
      )}

      {(technical.length > 0 || soft.length > 0) && (
        <div className="pr-skills">
          {technical.length > 0 && (
            <div className="pr-panel">
              <SectionHeading
                id="pr-technical"
                title="Technical skills"
                count={technical.length}
              />
              <ul className="pr-tags" aria-labelledby="pr-technical">
                {technical.map((s) => (
                  <li key={s.skill}>
                    <SkillTag
                      label={s.skill}
                      variant="technical"
                      level={s.level}
                    />
                  </li>
                ))}
              </ul>
              <p className="pr-legend">
                The dots show the level your documents support:
                <span className="pr-legend__item">
                  <LevelPips level="beginner" /> beginner
                </span>
                <span className="pr-legend__item">
                  <LevelPips level="intermediate" /> intermediate
                </span>
                <span className="pr-legend__item">
                  <LevelPips level="advanced" /> advanced
                </span>
              </p>
            </div>
          )}

          {soft.length > 0 && (
            <div className="pr-panel">
              <SectionHeading
                id="pr-soft"
                title="Soft skills"
                count={soft.length}
              />
              <ul className="pr-soft" aria-labelledby="pr-soft">
                {soft.map((s) => (
                  <li key={s.skill} className="pr-soft__item">
                    <SkillTag label={s.skill} variant="soft" />
                    {s.evidence && (
                      <span className="pr-soft__evidence">{s.evidence}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {experience.length > 0 && (
        <div className="pr-panel">
          <SectionHeading
            id="pr-experience"
            title="Experience"
            count={experience.length}
          />
          <ol className="pr-timeline" aria-labelledby="pr-experience">
            {experience.map((e, i) => (
              <li key={i} className="pr-timeline__item">
                <span className="pr-timeline__dot" aria-hidden="true" />
                <h4 className="pr-timeline__role">{e.title || e.organization}</h4>
                <p className="pr-timeline__org">
                  {[e.title ? e.organization : null, e.duration]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {e.summary && (
                  <p className="pr-timeline__summary">{e.summary}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {projects.length > 0 && (
        <div className="pr-panel">
          <SectionHeading
            id="pr-projects"
            title="Projects"
            count={projects.length}
          >
            <p className="pr-heading__note">
              Your coursework and personal projects, written the way an employer
              reads them.
            </p>
          </SectionHeading>
          <div className="pr-projects">
            {projects.map((p, i) => (
              <ProjectCard key={i} project={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
