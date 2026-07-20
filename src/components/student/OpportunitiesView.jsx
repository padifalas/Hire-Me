import { useState, useEffect, useCallback } from "react";
import { getStudentProfile } from "../../services/documentService";
import {
  getActiveOpportunities,
  getStudentApplications,
  computeMatchScore,
  applyToOpportunity,
} from "../../services/opportunityService";

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
  if (score >= 75) return "#16A34A";
  if (score >= 50) return "#DC8F00";
  return "#DC2626";
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

function CompanyMark({ name }) {
  const style = avatarStyleFor(name);
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";
  return (
    <div
      className="ov-company-mark"
      style={{ background: style.bg, color: style.color }}
    >
      {initials || <Building2 size={16} />}
    </div>
  );
}

function MatchExplanation({ result }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ov-match-explain">
      <button
        type="button"
        className="ov-match-explain__toggle"
        onClick={() => setOpen(!open)}
      >
        <Sparkles size={12} /> Why this score?{" "}
        <ChevronDown size={12} className={open ? "ov-chevron--open" : ""} />
      </button>
      {open && (
        <div className="ov-match-explain__body">
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
    <div className="ov-card">
      <div className="ov-card__top">
        <CompanyMark name={opportunity.employer?.company_name} />
        <div className="ov-card__heading">
          <div className="ov-card__title-row">
            <span className="ov-card__role">{opportunity.title}</span>
            <span
              className="ov-match-badge"
              style={{
                background: color + "18",
                color,
                border: `1px solid ${color}33`,
              }}
            >
              {matchResult.score}%
            </span>
          </div>
          <div className="ov-card__company">
            {opportunity.employer?.company_name ?? "Company"}
          </div>
          <div className="ov-card__meta-row">
            <span className="ov-card__location">
              <MapPin size={12} /> {opportunity.location}
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
              {skill} {isMatched && <Check size={11} />}
            </span>
          );
        })}
      </div>

      <MatchExplanation result={matchResult} />

      <div className="ov-card__footer">
        {applied ? (
          <>
            <span className="ov-applied-note">
              <CheckCircle2 size={14} />
              {appliedAt
                ? `Applied on ${new Date(appliedAt).toLocaleDateString()}`
                : "Applied"}
            </span>
            <button className="ov-apply-btn ov-apply-btn--applied" disabled>
              Applied <Check size={13} />
            </button>
          </>
        ) : (
          <button
            className="ov-apply-btn"
            onClick={() => onApply(opportunity, matchResult.score)}
            disabled={applying}
          >
            {applying ? "Submitting..." : "Apply Now →"}
          </button>
        )}
      </div>
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
  return (
    <div className="ov-top-pick">
      <div className="ov-top-pick__left">
        <span className="ov-top-pick__label">
          <Sparkles size={13} /> AI TOP PICK
        </span>
        <span className="ov-top-pick__title">
          {opportunity.title}{" "}
          <span className="ov-top-pick__at">
            @ {opportunity.employer?.company_name}
          </span>
        </span>
        <span className="ov-top-pick__badge">{matchResult.score}%</span>
        <div className="ov-top-pick__sub">
          {matchResult.matchedRequired.length}/
          {matchResult.matchedRequired.length +
            matchResult.missingRequired.length}{" "}
          required skills matched
        </div>
      </div>
      {applied ? (
        <button className="ov-apply-btn ov-apply-btn--applied" disabled>
          Applied <Check size={13} />
        </button>
      ) : (
        <button
          className="ov-top-pick__cta"
          onClick={() => onApply(opportunity, matchResult.score)}
          disabled={applying}
        >
          {applying ? "Submitting..." : "Apply Now →"}
        </button>
      )}
    </div>
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
  }, [user.id, search]);

  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(loadData, 300);
    return () => clearTimeout(timeout);
  }, [loadData, user]);

  async function handleApply(opportunity, score) {
    setApplyingId(opportunity.id);
    const result = await applyToOpportunity(user.id, opportunity.id, score);
    setApplyingId(null);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setAppliedMap((prev) =>
      new Map(prev).set(opportunity.id, new Date().toISOString()),
    );
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
        <p className="ov-subtitle">
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
        <div className="ov-search">
          <Search size={14} color="#94a3b8" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs or companies..."
          />
        </div>
        <div className="ov-score-pills">
          {SCORE_BUCKETS.map((b) => (
            <button
              key={b.key}
              className={`ov-score-pill${scoreBucket === b.key ? " ov-score-pill--active" : ""}`}
              onClick={() => setScoreBucket(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="ov-error">{error}</p>}

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
    </div>
  );
}
