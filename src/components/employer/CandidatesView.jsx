import { useState, useEffect, useMemo } from "react";
import { getCandidates } from "../../services/employerService";
import { getDocumentSignedUrl } from "../../services/documentService";

import "./CandidatesView.css";

import {
  Search,
  GraduationCap,
  MapPin,
  Sparkles,
  FileText,
  ChevronRight,
  Users,
} from "lucide-react";

function skillLabel(s) {
  return typeof s === "string" ? s : (s?.skill ?? "");
}

// Stable per-candidate avatar color, keyed off id so it doesn't change
// between renders/reloads for the same candidate.
const AVATAR_PALETTE = [
  { bg: "#dbeafe", color: "#1d4ed8" }, // blue
  { bg: "#cffafe", color: "#0891b2" }, // teal
  { bg: "#dcfce7", color: "#16a34a" }, // green
  { bg: "#fef3c7", color: "#b45309" }, // orange
];

function avatarStyleFor(id) {
  const hash = String(id ?? "")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function matchColor(score) {
  if (score === null || score === undefined) return "#94a3b8";
  if (score >= 75) return "#16A34A";
  if (score >= 50) return "#DC8F00";
  return "#DC2626";
}

function CandidateCard({ candidate }) {
  const [expanded, setExpanded] = useState(false);
  const [cvError, setCvError] = useState(null);

  const initials = candidate.full_name
    ? candidate.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "S";

  const skills = candidate.extracted_technical_skills || [];
  const hasAiProfile = candidate.ai_processing_status === "completed";
  const avatarStyle = avatarStyleFor(candidate.id);

  // ASSUMPTION: candidate.match_score isn't confirmed to exist yet on the
  // getCandidates() response - this renders only if present, so nothing
  // breaks if the field isn't there. Swap the field name here once the
  // real source (best match across active jobs? profile strength? etc.)
  // is confirmed.
  const hasMatchScore =
    candidate.match_score !== null && candidate.match_score !== undefined;

  async function handleViewCv() {
    if (!candidate.cv_url) return;
    setCvError(null);
    const result = await getDocumentSignedUrl("cv", candidate.cv_url);
    if (result.success) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      // CVs are only readable for students who've applied to one of ur company of
      // jobs
      setCvError(
        "This candidate's CV is only viewable once they've applied to one of your job postings.",
      );
    }
  }

  return (
    <div className="cd-card">
      <div className="cd-card__top">
        <div
          className="cd-avatar"
          style={{ background: avatarStyle.bg, color: avatarStyle.color }}
        >
          {initials}
        </div>
        <div className="cd-card__heading">
          <div className="cd-card__name-row">
            <span className="cd-card__name">{candidate.full_name}</span>
            {hasAiProfile && (
              <span className="cd-ai-badge">
                <Sparkles size={11} /> AI profile
              </span>
            )}
          </div>
          <div className="cd-card__meta">
            <GraduationCap size={12} /> {candidate.degree_program || "-"}
            {candidate.graduation_year
              ? ` · Class of ${candidate.graduation_year}`
              : ""}
          </div>
          {candidate.location && (
            <div className="cd-card__meta">
              <MapPin size={12} /> {candidate.location}
            </div>
          )}
        </div>
        {hasMatchScore && (
          <span
            className="cd-match-badge"
            style={{
              background: matchColor(candidate.match_score) + "18",
              color: matchColor(candidate.match_score),
              border: `1px solid ${matchColor(candidate.match_score)}33`,
            }}
          >
            {candidate.match_score}%
          </span>
        )}
      </div>

      {candidate.professional_summary && (
        <p className={`cd-summary${expanded ? "" : " cd-summary--clamped"}`}>
          {candidate.professional_summary}
        </p>
      )}

      {skills.length > 0 && (
        <div className="cd-chip-row">
          {(expanded ? skills : skills.slice(0, 6)).map((s, i) => (
            <span key={i} className="cd-chip cd-chip--technical">
              {skillLabel(s)}
            </span>
          ))}
          {!expanded && skills.length > 6 && (
            <span className="cd-chip cd-chip--muted">
              +{skills.length - 6} more
            </span>
          )}
        </div>
      )}

      <div className="cd-card__actions">
        <button
          type="button"
          className="cd-link-btn"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : "View profile"} <ChevronRight size={13} />
        </button>
        {candidate.cv_url && (
          <button
            type="button"
            className="cd-link-btn cd-link-btn--muted"
            onClick={handleViewCv}
          >
            <FileText size={13} /> View CV
          </button>
        )}
      </div>
      {cvError && <p className="cd-error">{cvError}</p>}
    </div>
  );
}

export default function CandidatesView() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await getCandidates();
      if (result.success) setCandidates(result.candidates);
      else setError(result.error);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => {
      const skills = (c.extracted_technical_skills || [])
        .map(skillLabel)
        .join(" ")
        .toLowerCase();
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.university?.toLowerCase().includes(q) ||
        c.degree_program?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        skills.includes(q)
      );
    });
  }, [candidates, search]);

  return (
    <div className="cd-root">
      <div className="cd-header">
        <h1 className="cd-title">Candidates</h1>
        <p className="cd-subtitle">
          {loading
            ? "Loading..."
            : `${filtered.length} candidate${filtered.length === 1 ? "" : "s"} with a completed profile`}
        </p>
      </div>

      <div className="cd-filters">
        <div className="cd-search">
          <Search size={14} color="#94a3b8" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, university, skill, or city..."
          />
        </div>
      </div>

      {error && <p className="cd-error">{error}</p>}

      {!loading && filtered.length === 0 && (
        <div className="cd-empty">
          <Users size={32} strokeWidth={1.5} />
          <p>
            {candidates.length === 0
              ? "No candidates with a completed profile yet."
              : "No candidates match your search."}
          </p>
        </div>
      )}

      <div className="cd-grid">
        {filtered.map((c) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}
