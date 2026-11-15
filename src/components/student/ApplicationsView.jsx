import { useState, useEffect, useMemo } from "react";

import {
  getStudentApplicationsWithDetails,
  APPLICATION_STATUS_LABELS,
} from "../../services/opportunityService.js";

import { matches } from "../../utils/searchUtils.js";

import "./ApplicationsView.css";

import {
  Sparkles,
  SlidersHorizontal,
  ClipboardList,
  ChevronDown,
} from "lucide-react";

function getInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseFeedback(text) {
  const headingMatch = text.match(/free resources[^:\n]*:/i);
  if (!headingMatch) return { intro: text, resources: [] };

  const intro = text.slice(0, headingMatch.index).trim();
  const resourceBlock = text.slice(headingMatch.index + headingMatch[0].length);

  const resources = [];
  const linePattern = /^-\s*([^:\n]+):\s*(.+)$/gm;
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  let lineMatch;
  while ((lineMatch = linePattern.exec(resourceBlock)) !== null) {
    const skill = lineMatch[1].trim();
    const linksPart = lineMatch[2];
    let linkMatch;
    linkPattern.lastIndex = 0;
    while ((linkMatch = linkPattern.exec(linksPart)) !== null) {
      resources.push({ skill, title: linkMatch[1], url: linkMatch[2] });
    }
  }

  return { intro, resources };
}

// Turns [text](url) inside a paragraph into real links.
function renderFeedbackText(text) {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <a
        key={key++}
        href={match[2]}
        target="_blank"
        rel="noreferrer"
        className="av-link"
      >
        {match[1]}
      </a>,
    );
    lastIndex = linkPattern.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts;
}

const STATUS_NOTES = {
  submitted:
    "Your application has been received. The employer hasn't opened it yet.",
  under_review: "The employer is reviewing your application.",
  interview:
    "The employer would like to interview you. Check your notifications for next steps.",
  hired: "Congratulations, you got the role.",
  rejected: "The employer didn't leave feedback for this application.",
};

function CompanyAvatar({ src, company }) {
  return (
    <span className="av-avatar" aria-hidden="true">
      {src ? (
        <img src={src} alt="" className="av-avatar__img" />
      ) : (
        getInitials(company)
      )}
    </span>
  );
}

function ApplicationRow({ app, highlighted }) {
  const statusMeta =
    APPLICATION_STATUS_LABELS[app.status] ??
    APPLICATION_STATUS_LABELS.submitted;
  const company = app.employer?.company_name ?? "Company";
  const role = app.opportunities?.title ?? "Opportunity";

  const feedback = useMemo(
    () =>
      app.status === "rejected" && app.rejection_feedback
        ? parseFeedback(app.rejection_feedback)
        : null,
    [app.status, app.rejection_feedback],
  );

  const [open, setOpen] = useState(Boolean(feedback));

  useEffect(() => {
    if (highlighted) setOpen(true);
  }, [highlighted]);

  const panelId = `app-panel-${app.id}`;

  return (
    <li
      id={`app-${app.id}`}
      tabIndex={-1}
      className={`av-row${highlighted ? " av-row--highlighted" : ""}`}
    >
      <button
        type="button"
        className="av-row__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="av-company">
          <CompanyAvatar src={app.employer?.logo_url} company={company} />
          <span className="av-company__name">{company}</span>
        </span>

        <span className="av-role">{role}</span>

        <span className="av-date">{formatDate(app.applied_at)}</span>

        <span className="av-status-cell">
          <span
            className="av-status"
            style={{
              "--av-status-color": statusMeta.color,
              "--av-status-bg": statusMeta.bg,
            }}
          >
            <span className="av-status__dot" aria-hidden="true" />
            {statusMeta.label}
          </span>
        </span>

        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`av-chevron${open ? " av-chevron--open" : ""}`}
        />
      </button>

      {open && (
        <div id={panelId} className="av-panel">
          {feedback ? (
            <div className="av-feedback">
              <h3 className="av-feedback__title">
                <Sparkles size={15} aria-hidden="true" />
                Feedback from the employer
              </h3>

              <p className="av-feedback__intro">
                {renderFeedbackText(feedback.intro)}
              </p>

              {feedback.resources.length > 0 && (
                <>
                  <hr className="av-feedback__divider" />
                  <h4 className="av-feedback__resources-title">
                    Free resources to close the gap
                  </h4>
                  <ul className="av-resources">
                    {feedback.resources.map((r, i) => (
                      <li key={i} className="av-resource">
                        <span className="av-resource__arrow" aria-hidden="true">
                          →
                        </span>
                        <span>
                          <span className="av-resource__skill">{r.skill}:</span>{" "}
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="av-link"
                          >
                            {r.title}
                          </a>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <p className="av-note">
              {STATUS_NOTES[app.status] ?? STATUS_NOTES.submitted}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default function ApplicationsView({
  user,
  searchQuery = "",
  highlightId,
  onHighlightHandled,
}) {
  const [activeTab, setActiveTab] = useState("All");
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [sortBy, setSortBy] = useState("date"); // "date" | "status"
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const result = await getStudentApplicationsWithDetails(user.id);
      if (result.success) setApplications(result.applications);
      setLoading(false);
    })();
  }, [user]);

  // Deep link from a notification: show every application, scroll to the one
  // the notification is about, and highlight it for a few seconds.
  useEffect(() => {
    if (!highlightId || loading) return;

    setActiveTab("All");
    setActiveHighlight(highlightId);

    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`app-${highlightId}`);
      if (!el) return;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el.scrollIntoView({
        block: "center",
        behavior: reduceMotion ? "auto" : "smooth",
      });
      el.focus({ preventScroll: true });
    }, 60);

    const clearTimer = setTimeout(() => {
      setActiveHighlight(null);
      onHighlightHandled?.();
    }, 6000);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightId, loading, onHighlightHandled]);

  const tabCounts = useMemo(() => {
    const counts = {};
    for (const app of applications) {
      counts[app.status] = (counts[app.status] || 0) + 1;
    }
    return counts;
  }, [applications]);

  const tabs = ["All", ...Object.keys(APPLICATION_STATUS_LABELS)];

  // Filter applications by the selected status tab.
  const filtered = useMemo(() => {
    return activeTab === "All"
      ? applications
      : applications.filter((a) => a.status === activeTab);
  }, [applications, activeTab]);

  // Filter the results further using the global search text.
  const searched = useMemo(() => {
    if (!searchQuery.trim()) return filtered;

    return filtered.filter((a) =>
      matches(
        searchQuery,
        a.opportunities?.title,
        a.employer?.company_name,
        APPLICATION_STATUS_LABELS[a.status]?.label,
      ),
    );
  }, [filtered, searchQuery]);

  // Sort the filtered and searched applications.
  const sorted = useMemo(() => {
    const list = [...searched];

    if (sortBy === "date") {
      list.sort(
        (a, b) => new Date(b.applied_at ?? 0) - new Date(a.applied_at ?? 0),
      );
    } else {
      list.sort((a, b) => (a.status ?? "").localeCompare(b.status ?? ""));
    }

    return list;
  }, [searched, sortBy]);

  const activeTabLabel =
    activeTab === "All"
      ? "All"
      : (APPLICATION_STATUS_LABELS[activeTab]?.label ?? activeTab);

  return (
    <div className="av-root">
      <div className="av-header">
        <div>
          <h1 className="av-title">My Applications</h1>
          <p className="av-subtitle" role="status" aria-live="polite">
            {loading
              ? "Loading..."
              : `${applications.length} total application${
                  applications.length === 1 ? "" : "s"
                }`}
          </p>
        </div>

        <div className="av-sort" role="group" aria-label="Sort applications">
          <SlidersHorizontal size={14} aria-hidden="true" />
          <span className="av-sort__label">Sort by:</span>
          <button
            type="button"
            className={`av-sort__btn${sortBy === "date" ? " av-sort__btn--active" : ""}`}
            aria-pressed={sortBy === "date"}
            onClick={() => setSortBy("date")}
          >
            Date
          </button>
          <button
            type="button"
            className={`av-sort__btn${sortBy === "status" ? " av-sort__btn--active" : ""}`}
            aria-pressed={sortBy === "status"}
            onClick={() => setSortBy("status")}
          >
            Status
          </button>
        </div>
      </div>

      <div className="av-tabs" role="group" aria-label="Filter by status">
        {tabs.map((tab) => {
          const label =
            tab === "All" ? "All" : APPLICATION_STATUS_LABELS[tab].label;
          const count = tab === "All" ? applications.length : tabCounts[tab];
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              className={`av-tab${active ? " av-tab--active" : ""}`}
              aria-pressed={active}
              onClick={() => setActiveTab(tab)}
            >
              {label}
              {Boolean(count) && <span className="av-tab__count">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="av-table" aria-busy={loading}>
        <div className="av-table__head" aria-hidden="true">
          <span>Company</span>
          <span>Role</span>
          <span>Date applied</span>
          <span>Status</span>
          <span />
        </div>

        {!loading && sorted.length === 0 && (
          <div className="av-empty">
            <div className="av-empty__icon">
              <ClipboardList size={22} aria-hidden="true" />
            </div>
            <p className="av-empty__title">No applications here</p>
            <p className="av-empty__sub">
              {searchQuery.trim()
                ? `No applications match "${searchQuery.trim()}".`
                : activeTab === "All"
                  ? "You haven't applied anywhere yet."
                  : `Applications marked "${activeTabLabel}" will appear here.`}
            </p>
          </div>
        )}

        <ul className="av-list">
          {sorted.map((app) => (
            <ApplicationRow
              key={app.id}
              app={app}
              highlighted={app.id === activeHighlight}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
