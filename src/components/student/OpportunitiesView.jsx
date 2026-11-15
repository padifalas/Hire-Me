import { useState, useEffect, useCallback, useId } from "react";
import { getStudentProfile } from "../../services/documentService";
import {
  getActiveOpportunities,
  getStudentApplications,
  computeMatchScore,
} from "../../services/opportunityService";
import ApplicationPreviewModal from "./ApplicationPreviewModal";
import "./OpportunitiesView.css";

import {
  Search,
  MapPin,
  Building2,
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

function CompanyMark({ name, src }) {
  const style = avatarStyleFor(name);
  const initials = getInitials(name);
  return (
    <div
      className="ov-company-mark"
      style={{ background: style.bg, color: style.color }}
      aria-hidden="true"
    >
      {src ? (
        <img src={src} alt="" className="ov-company-mark__img" />
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
        <Sparkles size={12} aria-hidden="true" /> Why this score?{" "}
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
          name={opportunity.employer?.company_name}
          src={opportunity.employer?.logo_url}
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

      <p className="ov-card__desc">{opportunity.description}</p>

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

function AiTopPickBanner({
  opportunity,
  matchResult,
  applied,
  onApply,
  applying,
}) {
  return (
    <section className="ov-top-pick">
      <div className="ov-top-pick__left">
        <span className="ov-top-pick__label">
          <Sparkles size={13} aria-hidden="true" /> AI TOP PICK
        </span>
        <span className="ov-top-pick__title">
          {opportunity.title}{" "}
          <span className="ov-top-pick__at">
            @ {opportunity.employer?.company_name}
          </span>
        </span>
        <span className="ov-top-pick__badge">
          {matchResult.score}% <span className="sr-only">match</span>
        </span>
        <div className="ov-top-pick__sub">
          {matchResult.matchedRequired.length}/
          {matchResult.matchedRequired.length +
            matchResult.missingRequired.length}{" "}
          required skills matched
        </div>
      </div>
      {applied ? (
        <button className="ov-apply-btn ov-apply-btn--applied" disabled>
          Applied <Check size={13} aria-hidden="true" />
        </button>
      ) : (
        <button
          className="ov-top-pick__cta"
          onClick={() => onApply(opportunity, matchResult.score)}
          disabled={applying}
          aria-label={`Apply to ${opportunity.title} at ${opportunity.employer?.company_name ?? "this company"}`}
        >
          {applying ? "Submitting..." : "Apply Now →"}
        </button>
      )}
    </section>
  );
}

export default function OpportunitiesView({
  user,
  search: searchProp,
  onSearchChange,
}) {
  const [localSearch, setLocalSearch] = useState("");
  const search = searchProp ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;

  const [opportunities, setOpportunities] = useState([]);
  const [studentSkills, setStudentSkills] = useState([]);
  const [appliedMap, setAppliedMap] = useState(new Map());

  const [scoreBucket, setScoreBucket] = useState("all");

  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const [error, setError] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [oppResult, profileResult, appsResult] = await Promise.all([
      getActiveOpportunities({}),
      getStudentProfile(user.id),
      getStudentApplications(user.id),
    ]);

    if (oppResult.success) setOpportunities(oppResult.opportunities);
    else setError(oppResult.error);

    if (profileResult.success) {
      setStudentSkills(profileResult.profile.extracted_technical_skills || []);
    }

    if (appsResult.success) {
      // ASSUMPTION: each application record includes applied_at (same field
      // other views in this app already read) - if getStudentApplications
      // doesn't select it, appliedAt will just come through as undefined
      // and the card falls back to showing "Applied" with no date.
      setAppliedMap(
        new Map(
          appsResult.applications.map((a) => [a.opportunity_id, a.applied_at]),
        ),
      );
    }

    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [loadData, user]);

  function handleApply(opportunity, score) {
    setSelectedOpportunity({ opportunity, score });
  }

  // Filter opportunities using the global or local search text.
  const q = search.trim().toLowerCase();

  const visibleOpportunities = q
    ? opportunities.filter((o) =>
        [o.title, o.employer?.company_name, o.location].some((f) =>
          String(f ?? "")
            .toLowerCase()
            .includes(q),
        ),
      )
    : opportunities;

  // Calculate match scores only for the visible opportunities.
  const scored = visibleOpportunities
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
            : `${visibleOpportunities.length} opportunit${visibleOpportunities.length === 1 ? "y" : "ies"} matching your profile`}
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
