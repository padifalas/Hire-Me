import { useState, useEffect, useMemo } from "react";

import {
  getStudentApplicationsWithDetails,
  APPLICATION_STATUS_LABELS,
} from "../../services/opportunityService.js";

import FeedbackFromEmployer from "../shared/FeedbackFromEmployer.jsx";
import "./ApplicationsView.css";

import { SlidersHorizontal, ClipboardList, ChevronDown } from "lucide-react";

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

  const hasFeedback =
    app.status === "rejected" && Boolean(app.rejection_feedback?.trim());

  const [open, setOpen] = useState(hasFeedback);

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
          {hasFeedback ? (
            <FeedbackFromEmployer
              text={app.rejection_feedback}
              company={company}
            />
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

  const sorted = useMemo(() => {
    const list =
      activeTab === "All"
        ? [...applications]
        : applications.filter((a) => a.status === activeTab);

    if (sortBy === "date") {
      list.sort(
        (a, b) => new Date(b.applied_at ?? 0) - new Date(a.applied_at ?? 0),
      );
    } else {
      list.sort((a, b) => (a.status ?? "").localeCompare(b.status ?? ""));
    }
    return list;
  }, [applications, activeTab, sortBy]);

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
              {activeTab === "All"
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
