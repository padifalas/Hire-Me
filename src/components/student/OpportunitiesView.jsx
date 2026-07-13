import { useState, useEffect, useCallback } from "react";
import { getStudentProfile } from "../../services/documentService";
import {
  getActiveOpportunities,
  getStudentApplications,
  computeMatchScore,
  applyToOpportunity,
} from "../../services/opportunityService";

import "./OpportunitiesView.css";

import { Search, MapPin, Building2, ChevronDown, Info } from "lucide-react";

const JOB_TYPES = [
  { value: "", label: "All types" },
  { value: "internship", label: "Internship" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

function matchColor(score) {
  if (score >= 75) return "#16A34A";
  if (score >= 50) return "#DC8F00";
  return "#DC2626";
}

function CompanyMark({ logoUrl, name }) {
  if (logoUrl) {
    return (
      <div className="ov-company-mark">
        <img src={logoUrl} alt={`${name} logo`} />
      </div>
    );
  }
  return (
    <div className="ov-company-mark ov-company-mark--fallback">
      <Building2 size={16} />
    </div>
  );
}

function MatchChip({ label, type }) {
  return (
    <span className={`ov-match-chip ov-match-chip--${type}`}>{label}</span>
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
        <Info size={12} /> Why this score?
      </button>
      {open && (
        <div className="ov-match-explain__body">
          {result.matchedRequired.length > 0 && (
            <div className="ov-match-explain__row">
              <span className="ov-match-explain__label">Match Required</span>
              <div className="ov-chip-row">
                {result.matchRequired.map((skill) => (
                  <MatchChip key={skill} label={skill} type="matched" />
                ))}
              </div>
            </div>
          )}
          {result.missingRequired.length > 0 && (
            <div className="ov-match-explain__row">
              <span className="ov-match-explain__label">Missing Required</span>
              <div className="ov-chip-row">
                {result.missingRequired.map((skill) => (
                  <MatchChip key={skill} label={skill} type="missing" />
                ))}
              </div>
            </div>
          )}
          {result.matchedNice.length > 0 && (
            <div className="ov-match-explain__row">
              <span className="ov-match-explain__label">
                Match Nice-to-have
              </span>
              <div className="ov-chip-row">
                {result.matchedNice.map((skill) => (
                  <MatchChip key={skill} label={skill} type="nice" />
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
  onApply,
  applying,
}) {
  const salaryText =
    opportunity.salary_min && opportunity.salary_max
      ? `R${opportunity.salary_min.toLocaleString()} - R${opportunity.salary_max.toLocaleString()}/mo`
      : null;

  return (
    <div className="ov-card">
      <div className="ov-card__top">
        <CompanyMark
          logoUrl={opportunity.employer?.logo_url}
          name={opportunity.employer?.company_name}
        />
        <span
          className="ov-match-badge"
          style={{
            background: matchColor(matchResult.score) + "18",
            color: matchColor(matchResult.score),
            border: `1px solid ${matchColor(matchResult.score)}33`,
          }}
        >
          {matchResult.score}% match
        </span>
      </div>

      <div className="ov-card__body">
        <div className="ov-card__role">{opportunity.title}</div>
        <div className="ov-card__company">
          {opportunity.employer?.company_name ?? "Company"}
        </div>
        <div className="ov-card__location">
          <MapPin size={11} />
          {opportunity.location}
          {opportunity.remote_option && (
            <span className="ov-remote-tag">Remote/Hybrid</span>
          )}
        </div>
        {salaryText && <div className="ov-card__salary">{salaryText}</div>}

        <p className="ov-card__desc">{opportunity.description}</p>

        <div className="ov-card__tags">
          {(opportunity.required_skills || []).slice(0, 5).map((skill) => {
            const isMissing = matchResult.missingRequired.includes(skill);
            const isMatched = matchResult.matchedRequired.includes(skill);
            return (
              <span
                key={skill}
                className={`ov-tags${isMatched ? " ov-tags--matched" : ""}${isMissing ? " ov-tags--missing" : ""}`}
              >
                {skill}
              </span>
            );
          })}
        </div>

        <MatchExplanation result={matchResult} />
      </div>

      <button
        className={`ov-apply-btn${applied ? " ov-apply-btn--applied" : ""}`}
        onClick={() => onApply(opportunity, matchResult.score)}
        disabled={applied || applying}
      >
        {applied ? "Applied ✓" : applying ? "Submitting..." : "Apply now"}
      </button>
    </div>
  );
}

export default function OpportunitiesView({ user }) {
  const [opportunities, setOpportunities] = useState([]);
  const [studentSkills, setStudentSkills] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());

  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState("");
  const [location, setLocation] = useState("");

  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [oppResult, profileResult, appsResult] = await Promise.all([
      getActiveOpportunities({ search, jobType, location }),
      getStudentProfile(user.id),
      getStudentApplications(user.id),
    ]);

    if (oppResult.success) setOpportunities(oppResult.opportunities);
    else setError(oppResult.error);

    if (profileResult.success) {
      setStudentSkills(profileResult.profile.extracted_technical_skills || []);
    }

    if (appsResult.success) {
      setAppliedIds(
        new Set(appsResult.applications.map((a) => a.opportunity_id)),
      );
    }

    setLoading(false);
  }, [user.id, search, jobType, location]);

  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(loadData, 300); // small debounce for search typing
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
    setAppliedIds((prev) => new Set(prev).add(opportunity.id));
  }

  return (
    <div className="ov-root">
      <div className="ov-header">
        <h1 className="ov-title">Opportunities</h1>
        <p className="ov-subtitle">
          {loading
            ? "Loading..."
            : `${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"} matching your filters`}
        </p>
      </div>

      <div className="ov-filters">
        <div className="ov-search">
          <Search size={14} color="#94a3b8" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job titles..."
          />
        </div>
        <div className="ov-select-wrap">
          <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
            {JOB_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>
        <input
          className="ov-location-input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Filter by city..."
        />
      </div>

      {error && <p className="ov-error">{error}</p>}

      {!loading && opportunities.length === 0 && (
        <div className="ov-empty">
          No opportunities match your filters right now.
        </div>
      )}

      <div className="ov-grid">
        {opportunities.map((opp) => {
          const matchResult = computeMatchScore(studentSkills, opp);
          return (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              matchResult={matchResult}
              applied={appliedIds.has(opp.id)}
              applying={applyingId === opp.id}
              onApply={handleApply}
            />
          );
        })}
      </div>
    </div>
  );
}
