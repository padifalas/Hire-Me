import { useState, useEffect, useCallback, useId } from "react";
import { getStudentProfile } from "../../services/documentService";
import {
  getActiveOpportunities,
  getStudentApplications,
  computeMatchScore,
} from "../../services/opportunityService";
import ApplicationPreviewModal from "./ApplicationPreviewModal";
import "./OpportunitiesView.css";
import JobDescription from "./JobDescription";

import {
  Search,
  MapPin,
  Building2,
  Brain,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Check,
} from "lucide-react";

function matchColor(score) {
  if (score >= 75) return "#15803D";
  if (score >= 50) return "#B45309";
  return "#B91C1C";
}

const SCORE_BUCKETS = [
  { key: "all", label: "All scores", test: () => true },
  { key: "80", label: "80+ match", test: (s) => s >= 80 },
  { key: "60-79", label: "60-79 match", test: (s) => s >= 60 && s < 80 },
  { key: "low", label: "< 60 match", test: (s) => s < 60 },
];

// Rotating avatar color, stable per company name (same approach used on
// the Candidates page for visual consistency across the app).
const AVATAR_PALETTE = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#fee2e2", color: "#dc2626" },
  { bg: "#dcfce7", color: "#16a34a" },
  { bg: "#fef3c7", color: "#b45309" },
  { bg: "#f5f3ff", color: "#7c3aed" },
];

function avatarStyleFor(key) {
  const hash = String(key ?? "")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getInitials(name) {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function CompanyMark({ name, logoUrl }) {
  const [failed, setFailed] = useState(false);
  const style = avatarStyleFor(name);
  const initials = getInitials(name);
  const showImg = Boolean(logoUrl) && !failed;

  return (
    <div
      className={`ov-company-mark${showImg ? " ov-company-mark--img" : ""}`}
      style={showImg ? undefined : { background: style.bg, color: style.color }}
      aria-hidden="true"
    >
      {showImg ? (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        initials || <Building2 size={16} />
      )}
    </div>
  );
}

function MatchExplanation({ result }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="ov-match-explain">
      <button
        type="button"
        className="ov-match-explain__toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Brain size={12} aria-hidden="true" /> Why this score?{" "}
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={open ? "ov-chevron--open" : ""}
        />
      </button>
      {open && (
        <div className="ov-match-explain__body" id={panelId}>
          {result.matchedRequired.length > 0 && (
            <div className="ov-match-explain__row">
              <span className="ov-match-explain__label">Matched required</span>
              <div className="ov-chip-row">
                {result.matchedRequired.map((skill) => (
                  <span
                    key={skill}
                    className="ov-skill-chip ov-skill-chip--matched"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {result.missingRequired.length > 0 && (
            <div className="ov-match-explain__row">
              <span className="ov-match-explain__label">Missing required</span>
              <div className="ov-chip-row">
                {result.missingRequired.map((skill) => (
                  <span
                    key={skill}
                    className="ov-skill-chip ov-skill-chip--missing"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.matchedNice.length > 0 && (
            <div className="ov-match-explain__row">
              <span className="ov-match-explain__label">
                Matched nice-to-have
              </span>
              <div className="ov-chip-row">
                {result.matchedNice.map((skill) => (
                  <span
                    key={skill}
                    className="ov-skill-chip ov-skill-chip--nice"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OpportunityCard({
  opportunity,
  matchResult,
  applied,
  appliedAt,
  onApply,
  applying,
}) {
  const salaryText =
    opportunity.salary_min && opportunity.salary_max
      ? `R${opportunity.salary_min.toLocaleString()} - R${opportunity.salary_max.toLocaleString()}/mo`
      : null;
  const color = matchColor(matchResult.score);

  return (
    <article
      className="ov-card"
      aria-labelledby={`opp-${opportunity.id}-title`}
    >
      <div className="ov-card__top">
        <CompanyMark
          key={opportunity.employer?.logo_url}
          name={opportunity.employer?.company_name}
          logoUrl={opportunity.employer?.logo_url}
        />
        <div className="ov-card__heading">
          <div className="ov-card__title-row">
            <h2 className="ov-card__role" id={`opp-${opportunity.id}-title`}>
              {opportunity.title}
            </h2>
            <span
              className="ov-match-badge"
              style={{
                background: color + "18",
                color,
                border: `1px solid ${color}33`,
              }}
            >
              {matchResult.score}% <span className="sr-only">match</span>
            </span>
          </div>
          <div className="ov-card__company">
            {opportunity.employer?.company_name ?? "Company"}
          </div>
          <div className="ov-card__meta-row">
            <span className="ov-card__location">
              <MapPin size={12} aria-hidden="true" /> {opportunity.location}
            </span>
            {opportunity.remote_option && (
              <span className="ov-remote-tag">Remote/Hybrid</span>
            )}
            {salaryText && (
              <span className="ov-card__salary">{salaryText}</span>
            )}
          </div>
        </div>
      </div>

      <JobDescription text={opportunity.description} />

      <div className="ov-card__tags">
        {(opportunity.required_skills || []).slice(0, 4).map((skill) => {
          const isMatched = matchResult.matchedRequired?.includes(skill);
          return (
            <span
              key={skill}
              className={`ov-tag${isMatched ? " ov-tag--matched" : ""}`}
            >
              {skill}{" "}
              {isMatched && (
                <>
                  <Check size={11} aria-hidden="true" />
                  <span className="sr-only">(you have this skill)</span>
                </>
              )}
            </span>
          );
        })}

        {(opportunity.required_skills?.length ?? 0) > 4 && (
          <span className="ov-tag">
            +{opportunity.required_skills.length - 4} more
          </span>
        )}
      </div>

      <MatchExplanation result={matchResult} />

      <div className="ov-card__footer">
        {applied ? (
          <>
            <span className="ov-applied-note">
              <CheckCircle2 size={14} aria-hidden="true" />
              {appliedAt
                ? `Applied on ${new Date(appliedAt).toLocaleDateString()}`
                : "Applied"}
            </span>
            <button className="ov-apply-btn ov-apply-btn--applied" disabled>
              Applied <Check size={13} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            className="ov-apply-btn"
            onClick={() => onApply(opportunity, matchResult.score)}
            disabled={applying}
            aria-label={`Apply to ${opportunity.title} at ${opportunity.employer?.company_name ?? "this company"}`}
          >
            {applying ? "Submitting..." : "Apply Now →"}
          </button>
        )}
      </div>
    </article>
  );
}

function ScoreRing({ score, color, size = 68 }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;

  return (
    <div className="ov-ring" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          stroke="#e8edf2"
          strokeWidth={stroke}
        />
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform={`rotate(-90 ${mid} ${mid})`}
        />
      </svg>
      <span className="ov-ring__num" style={{ color }}>
        {score}%<span className="sr-only"> match</span>
      </span>
    </div>
  );
}

function AiTopPickBanner({
  opportunity,
  matchResult,
  applied,
  onApply,
  applying,
}) {
  const company = opportunity.employer?.company_name ?? "this company";
  const { score, matchedRequired, missingRequired } = matchResult;
  const total = matchedRequired.length + missingRequired.length;
  const color = matchColor(score);

  const eyebrow =
    score >= 75
      ? "Your strongest match"
      : score >= 50
        ? "Your best AI match so far"
        : "Closest AI match right now";

  let headline;
  if (total === 0)
    headline = "No specific skills required, so it's a good place to start.";
  else if (missingRequired.length === 0)
    headline = `You have all ${total} required skills.`;
  else
    headline = `You have ${matchedRequired.length} of ${total} required skills.`;

  const salaryText =
    opportunity.salary_min && opportunity.salary_max
      ? `R${opportunity.salary_min.toLocaleString()} - R${opportunity.salary_max.toLocaleString()}/mo`
      : null;

  const shownMatched = matchedRequired.slice(0, 4);
  const hiddenMatched = matchedRequired.length - shownMatched.length;
  const shownMissing = missingRequired.slice(0, 2);

  return (
    <section className="ov-pick" aria-label="Your top match">
      <CompanyMark
        key={opportunity.employer?.logo_url}
        name={opportunity.employer?.company_name}
        logoUrl={opportunity.employer?.logo_url}
      />

      <div className="ov-pick__body">
        <span className="ov-pick__eyebrow">
          <Brain size={13} aria-hidden="true" /> {eyebrow}
        </span>

        <h2 className="ov-pick__title">
          {opportunity.title} <span className="ov-pick__at">at {company}</span>
        </h2>

        <div className="ov-pick__meta">
          {opportunity.location && (
            <span>
              <MapPin size={12} aria-hidden="true" /> {opportunity.location}
            </span>
          )}
          {opportunity.remote_option && <span>Remote/Hybrid</span>}
          {salaryText && <span className="ov-pick__salary">{salaryText}</span>}
        </div>

        <p className="ov-pick__headline">{headline}</p>

        {(shownMatched.length > 0 || shownMissing.length > 0) && (
          <div className="ov-pick__skills">
            {shownMatched.map((s) => (
              <span key={s} className="ov-skill-chip ov-skill-chip--matched">
                <Check size={10} aria-hidden="true" /> {s}
              </span>
            ))}
            {hiddenMatched > 0 && (
              <span className="ov-pick__more">+{hiddenMatched} more</span>
            )}
            {shownMissing.length > 0 && (
              <span className="ov-pick__gap-label">To add:</span>
            )}
            {shownMissing.map((s) => (
              <span key={s} className="ov-skill-chip ov-skill-chip--missing">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="ov-pick__aside">
        <ScoreRing score={score} color={color} />
        {applied ? (
          <button className="ov-apply-btn ov-apply-btn--applied" disabled>
            Applied <Check size={13} aria-hidden="true" />
          </button>
        ) : (
          <button
            className="ov-top-pick__cta"
            onClick={() => onApply(opportunity, score)}
            disabled={applying}
            aria-label={`Apply to ${opportunity.title} at ${company}`}
          >
            {applying ? "Submitting..." : "Apply Now →"}
          </button>
        )}
      </div>
    </section>
  );
}

export default function OpportunitiesView({ user }) {
  const [opportunities, setOpportunities] = useState([]);
  const [studentSkills, setStudentSkills] = useState([]);
  const [appliedMap, setAppliedMap] = useState(new Map());

  const [search, setSearch] = useState("");
  const [scoreBucket, setScoreBucket] = useState("all");

  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const [error, setError] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [oppResult, profileResult, appsResult] = await Promise.all([
      getActiveOpportunities({ search }),
      getStudentProfile(user.id),
      getStudentApplications(user.id),
    ]);

    if (oppResult.success) setOpportunities(oppResult.opportunities);
    else setError(oppResult.error);

    if (profileResult.success) {
      setStudentSkills(profileResult.profile.extracted_technical_skills || []);
    }

    if (appsResult.success) {
      setAppliedMap(
        new Map(
          appsResult.applications.map((a) => [a.opportunity_id, a.applied_at]),
        ),
      );
    }

    setLoading(false);
  }, [user.id, search]);

  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(loadData, 300);
    return () => clearTimeout(timeout);
  }, [loadData, user]);

  function handleApply(opportunity, score) {
    setSelectedOpportunity({ opportunity, score });
  }

  const scored = opportunities
    .map((o) => ({ opportunity: o, ...computeMatchScore(studentSkills, o) }))
    .sort((a, b) => b.score - a.score);

  const topPick = scored[0];
  const rest = scored.slice(1);

  const bucket =
    SCORE_BUCKETS.find((b) => b.key === scoreBucket) ?? SCORE_BUCKETS[0];
  const filtered = rest.filter((m) => bucket.test(m.score));

  return (
    <div className="ov-root">
      <div className="ov-header">
        <h1 className="ov-title">Opportunities</h1>
        <p className="ov-subtitle" role="status" aria-live="polite">
          {loading
            ? "Loading..."
            : `${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"} matching your profile`}
        </p>
      </div>

      {!loading && topPick && (
        <AiTopPickBanner
          opportunity={topPick.opportunity}
          matchResult={topPick}
          applied={appliedMap.has(topPick.opportunity.id)}
          appliedAt={appliedMap.get(topPick.opportunity.id)}
          onApply={handleApply}
          applying={applyingId === topPick.opportunity.id}
        />
      )}

      <div className="ov-filters">
        <div className="ov-search" role="search">
          <Search size={14} color="#94a3b8" aria-hidden="true" />
          <label htmlFor="ov-search" className="sr-only">
            Search jobs or companies
          </label>

          <input
            id="ov-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs or companies..."
          />
        </div>

        <div
          className="ov-score-pills"
          role="group"
          aria-label="Filter by match score"
        >
          {SCORE_BUCKETS.map((b) => (
            <button
              key={b.key}
              className={`ov-score-pill${scoreBucket === b.key ? " ov-score-pill--active" : ""}`}
              onClick={() => setScoreBucket(b.key)}
              aria-pressed={scoreBucket === b.key}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="ov-error" role="alert">
          {error}
        </p>
      )}

      {!loading && filtered.length === 0 && (
        <div className="ov-empty">
          No opportunities match your filters right now.
        </div>
      )}

      <div className="ov-list">
        {filtered.map((m) => (
          <OpportunityCard
            key={m.opportunity.id}
            opportunity={m.opportunity}
            matchResult={m}
            applied={appliedMap.has(m.opportunity.id)}
            appliedAt={appliedMap.get(m.opportunity.id)}
            applying={applyingId === m.opportunity.id}
            onApply={handleApply}
          />
        ))}
      </div>
      {selectedOpportunity && (
        <ApplicationPreviewModal
          user={user}
          opportunity={selectedOpportunity.opportunity}
          onClose={() => setSelectedOpportunity(null)}
          onSubmitted={() => {
            setAppliedMap((prev) =>
              new Map(prev).set(
                selectedOpportunity.opportunity.id,
                new Date().toISOString(),
              ),
            );
            setSelectedOpportunity(null);
          }}
        />
      )}
    </div>
  );
}
