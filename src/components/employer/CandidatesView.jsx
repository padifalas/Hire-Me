import { useState, useEffect, useMemo } from "react";
import { getCandidates } from "../../services/employerService";
import { getDocumentSignedUrl } from "../../services/documentService";

import "./CandidatesView.css";

import {
  Search,
  GraduationCap,
  MapPin,
  Sparkles,
  FileDown,
  Users,
} from "lucide-react";

function skillLabel(s) {
  return typeof s === "string" ? s : (s?.skill ?? "");
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
        <div className="cd-avatar">{initials}</div>
        <div className="cd-card__heading">
          <div className="cd-card__name">{candidate.full_name}</div>
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
        {hasAiProfile && (
          <span className="cd-ai-badge">
            <Sparkles size={11} /> AI profile
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
          {expanded ? "Show less" : "View more"}
        </button>
        {candidate.cv_url && (
          <button type="button" className="cd-link-btn" onClick={handleViewCv}>
            <FileDown size={13} /> View CV
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
