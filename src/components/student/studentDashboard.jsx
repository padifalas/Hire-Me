import { useState, useEffect, useMemo } from "react";

import { useAuth } from "../../contexts/authContext";
import { signOut } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { getStudentProfile } from "../../services/documentService";
import {
  getActiveOpportunities,
  getStudentApplicationsWithDetails,
  computeMatchScore,
  APPLICATION_STATUS_LABELS,
} from "../../services/opportunityService";

import "./StudentDashboard.css";
import Footer from "../layout/footer.jsx";
import "../layout/footer.css";
import ProfileView from "./ProfileView.jsx";
import OpportunitiesView from "./OpportunitiesView.jsx";
import HireMeLogo from "../../assets/HireMeLogo.png";

import {
  Briefcase,
  Lightbulb,
  FileText,
  User,
  Bell,
  Menu,
  Search,
  Upload,
  Building2,
  Percent,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  Sparkles,
  SlidersHorizontal,
  ClipboardList,
  LogOut,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: Briefcase, label: "Dashboard", id: "dashboard" },
  { icon: Lightbulb, label: "Opportunities", id: "opportunities" },
  { icon: FileText, label: "Applications", id: "applications" },
  { icon: User, label: "Profile", id: "profile" },
  { icon: Bell, label: "Notifications", id: "notifications" },
];

/* Small components used throughout the student dashboard page */

// Rotating avatar color, stable per company name - same approach used on
// the Opportunities and Candidates pages for visual consistency.
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

// Handles both "Takealot" (single word -> first 2 chars) and "Patrick
// Zonda" (multi-word -> first letter of each, up to 2) so single-word
// company names don't collapse to a single letter.
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

function CompanyLogo({ src, company, size = 32 }) {
  const style = avatarStyleFor(company);
  const initials = getInitials(company);
  return (
    <div
      className="sd-company-logo"
      style={{
        width: size,
        height: size,
        background: src ? undefined : style.bg,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={`${company} logo`}
          className="sd-company-logo__img"
        />
      ) : (
        <span
          className="sd-company-logo__initials"
          style={{ color: style.color, fontSize: size * 0.38 }}
        >
          {initials || (
            <Building2 size={Math.round(size * 0.5)} color="#94a3b8" />
          )}
        </span>
      )}
    </div>
  );
}

function MatchBadge({ match, color }) {
  return (
    <span
      className="sd-match-badge"
      style={{
        background: color + "18",
        color: color,
        border: `1px solid ${color}33`,
      }}
    >
      {match}%
    </span>
  );
}

function StatusBadge({ status, color, bg }) {
  return (
    <span className="sd-status-badge" style={{ background: bg, color }}>
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, value, label, sub, tint }) {
  return (
    <div className="sd-stat-card">
      <div className={`sd-stat-card__icon sd-stat-card__icon--${tint}`}>
        <Icon size={16} />
      </div>
      <div className="sd-stat-card__value">{value}</div>
      <div className="sd-stat-card__label">{label}</div>
      {sub && <div className="sd-stat-card__sub">{sub}</div>}
    </div>
  );
}

function ChecklistItem({ label, done }) {
  return (
    <div
      className={`sd-checklist-item${done ? " sd-checklist-item--done" : ""}`}
    >
      {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
      <span>{label}</span>
    </div>
  );
}

// Matches the real output of the generate-rejection-feedback Edge Function
// exactly (confirmed against its source):
//   <message paragraph>
//
//   Free resources to help close the gap:
//   - skillA: [Title 1](url1), [Title 2](url2)
//   - skillB: [Title 3](url3)
//
// Each "- skill: ..." line can carry one or more comma-separated markdown
// links. The skill name is plain text before the colon, NOT inside the
// link - so each resource is rendered as "Skill: Title" with only the
// title portion actually clickable... matching the "Node.js: freeCodeCamp -
// APIs and Microservices" style bullets in the design.
function parseFeedback(text) {
  const headingMatch = text.match(/free resources[^:\n]*:/i);
  if (!headingMatch) {
    return { intro: text, resources: [] };
  }

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

function renderFeedbackText(text) {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <a
        key={key++}
        href={match[2]}
        target="_blank"
        rel="noreferrer"
        className="sd-feedback-link"
      >
        {match[1]}
      </a>,
    );
    lastIndex = linkPattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function matchColor(score) {
  if (score >= 75) return "#16A34A";
  if (score >= 50) return "#DC8F00";
  return "#DC2626";
}

function computeProfileStrength(profile) {
  if (!profile) return 0;
  const checks = [
    Boolean(profile.university),
    Boolean(profile.degree_program),
    Boolean(profile.location),
    Boolean(profile.phone),
    Boolean(profile.cv_url),
    Boolean(profile.transcript_url),
    Boolean(
      profile.linkedin_url || profile.github_url || profile.portfolio_url,
    ),
    profile.ai_processing_status === "completed",
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

// The four checklist items shown on the Profile Strength card - a readable
// subset of the checks computeProfileStrength() already tallies internally.
function profileChecklist(profile) {
  if (!profile) return [];
  return [
    { label: "CV uploaded", done: Boolean(profile.cv_url) },
    {
      label: "AI analysis run",
      done: profile.ai_processing_status === "completed",
    },
    { label: "Transcript", done: Boolean(profile.transcript_url) },
    {
      label: "Portfolio link",
      done: Boolean(
        profile.portfolio_url || profile.linkedin_url || profile.github_url,
      ),
    },
  ];
}

// ASSUMPTION: there is no notifications/activity table in the services
// available yet - "BBD viewed your profile" style events need real
// view-tracking on the backend, which doesn't exist here. This derives a
// best-effort activity feed from status changes already present in
// recentApps plus new-match counts, so the panel isn't empty, but it will
// NOT show employer-side view events until a real activity feed is wired
// in. Swap this out once that endpoint exists.
function buildActivityFeed(recentApps, newMatchCount) {
  const items = [];

  for (const app of recentApps) {
    const company = app.employer?.company_name ?? "An employer";
    const role = app.opportunities?.title ?? "your application";
    if (app.status === "rejected") {
      items.push({
        id: `${app.id}-rejected`,
        text: `${company} rejected your application for ${role}`,
        color: "#dc2626",
        date: app.applied_at,
      });
    } else if (app.status === "submitted" || app.status === "under_review") {
      items.push({
        id: `${app.id}-review`,
        text: `Your application to ${company} is Under Review`,
        color: "#16a34a",
        date: app.applied_at,
      });
    } else if (app.status === "interview") {
      items.push({
        id: `${app.id}-interview`,
        text: `${company} requested an interview for ${role}`,
        color: "#7c3aed",
        date: app.applied_at,
      });
    } else if (app.status === "hired") {
      items.push({
        id: `${app.id}-hired`,
        text: `Congratulations! ${company} hired you for ${role}`,
        color: "#16a34a",
        date: app.applied_at,
      });
    }
  }

  if (newMatchCount > 0) {
    items.push({
      id: "new-matches",
      text: `${newMatchCount} new job match${newMatchCount === 1 ? "" : "es"} added - check Opportunities`,
      color: "#0077c8",
      date: null,
    });
  }

  return items.slice(0, 5);
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* Top matches row - an opportunity + its computed match score, rendered as
   a table row (Company / Role / Match / Apply), matching the wireframe.
   NOT an application - this is a suggested opportunity the student hasn't
   necessarily applied to yet. */

function MatchRow({ opportunity, matchResult, onNavigate }) {
  const company = opportunity.employer?.company_name ?? "Company";
  const salaryText =
    opportunity.salary_min && opportunity.salary_max
      ? `R${opportunity.salary_min.toLocaleString()}/mo+`
      : null;

  return (
    <div className="sd-app-row">
      <div className="sd-app-row__grid sd-app-row__grid--match">
        <div className="sd-app-row__title-cell">
          <CompanyLogo
            src={opportunity.employer?.logo_url}
            company={company}
            size={34}
          />
          <div>
            <div className="sd-app-row__role--strong">{opportunity.title}</div>
            <div className="sd-app-row__sub-line">
              {company}
              {opportunity.location ? ` · ${opportunity.location}` : ""}
              {salaryText ? ` · ${salaryText}` : ""}
            </div>
          </div>
        </div>
        <MatchBadge
          match={matchResult.score}
          color={matchColor(matchResult.score)}
        />
        <button
          className="sd-view-link"
          onClick={() => onNavigate("opportunities")}
        >
          View →
        </button>
      </div>
    </div>
  );
}

/* real application + opportunity/employer details */

function AppRow({ app, showFeedback = false }) {
  const statusMeta =
    APPLICATION_STATUS_LABELS[app.status] ??
    APPLICATION_STATUS_LABELS.submitted;
  const company = app.employer?.company_name ?? "Company";
  const role = app.opportunities?.title ?? "Opportunity";
  const feedback =
    showFeedback && app.status === "rejected" && app.rejection_feedback
      ? parseFeedback(app.rejection_feedback)
      : null;

  return (
    <div className="sd-app-row">
      <div className="sd-app-row__grid">
        <div className="sd-app-row__company-cell">
          <CompanyLogo
            src={app.employer?.logo_url}
            company={company}
            size={32}
          />
          <span className="sd-app-row__company-name">{company}</span>
        </div>
        <span className="sd-app-row__role">{role}</span>
        <div className="sd-app-row__date">
          {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "-"}
        </div>
        <StatusBadge
          status={statusMeta.label}
          color={statusMeta.color}
          bg={statusMeta.bg}
        />
      </div>

      {feedback && (
        <div className="sd-ai-feedback">
          <div className="sd-ai-feedback__title">
            <Sparkles size={14} /> Feedback from employer
          </div>
          <p className="sd-ai-feedback__intro">
            {renderFeedbackText(feedback.intro)}
          </p>

          {feedback.resources.length > 0 && (
            <>
              <div className="sd-ai-feedback__divider" />
              <div className="sd-ai-feedback__resources-title">
                Free resources to close the gap:
              </div>
              <ul className="sd-ai-feedback__resources">
                {feedback.resources.map((r, i) => (
                  <li key={i}>
                    <span className="sd-ai-feedback__arrow">→</span>{" "}
                    <span className="sd-ai-feedback__skill">{r.skill}:</span>{" "}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="sd-feedback-link"
                    >
                      {r.title}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/*table header */

function TableHeader({ columns, variant = "default" }) {
  return (
    <div
      className={`sd-table-header${variant === "match" ? " sd-table-header--match" : ""}`}
    >
      {columns.map((h) => (
        <span key={h} className="sd-table-th">
          {h}
        </span>
      ))}
    </div>
  );
}

/* dash view */

function DashboardView({ studentName, user, onNavigate }) {
  const firstName = (studentName ?? "there").split(" ")[0];

  const [profile, setProfile] = useState(null);
  const [topMatches, setTopMatches] = useState([]);
  const [strongMatchCount, setStrongMatchCount] = useState(0);
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      const [profileResult, oppResult, appsResult] = await Promise.all([
        getStudentProfile(user.id),
        getActiveOpportunities({}),
        getStudentApplicationsWithDetails(user.id),
      ]);

      if (profileResult.success) setProfile(profileResult.profile);

      if (oppResult.success) {
        const skills = profileResult.success
          ? profileResult.profile.extracted_technical_skills || []
          : [];
        const scored = oppResult.opportunities
          .map((o) => ({ opportunity: o, ...computeMatchScore(skills, o) }))
          .sort((a, b) => b.score - a.score);
        setTopMatches(scored.slice(0, 3));
        setStrongMatchCount(scored.filter((m) => m.score >= 60).length);
      }

      if (appsResult.success)
        setRecentApps(appsResult.applications.slice(0, 5));

      setLoading(false);
    })();
  }, [user]);

  const profileStrength = computeProfileStrength(profile);
  const checklist = useMemo(() => profileChecklist(profile), [profile]);
  const incompleteCount = checklist.filter((c) => !c.done).length;

  // NOTE: recentApps is capped at 5, so these are approximations, not true
  // totals - see chat notes on wiring a real aggregate query.
  const applicationsSent = recentApps.length;
  const underReviewCount = recentApps.filter(
    (a) => a.status === "submitted" || a.status === "under_review",
  ).length;
  const avgMatchScore = topMatches.length
    ? Math.round(
        topMatches.reduce((sum, m) => sum + m.score, 0) / topMatches.length,
      )
    : 0;

  const activityFeed = useMemo(
    () => buildActivityFeed(recentApps, topMatches.length),
    [recentApps, topMatches],
  );

  return (
    <div className="sd-dashboard">
      <div>
        <h1 className="sd-greeting__title">Good day, {firstName}</h1>
        <div className="sd-stats-pills">
          <span className="sd-stat-pill">
            <span className="sd-stat-pill__num">{strongMatchCount}</span>{" "}
            Matches
          </span>
          <span className="sd-stat-pill__sep">·</span>
          <span className="sd-stat-pill">
            <span className="sd-stat-pill__num">{applicationsSent}</span>{" "}
            Applications
          </span>
          <span className="sd-stat-pill__sep">·</span>
          <span className="sd-stat-pill sd-stat-pill--green">
            <span className="sd-stat-pill__num">{underReviewCount}</span> Under
            Review
          </span>
        </div>
      </div>

      <div className="sd-stat-cards">
        <StatCard
          icon={Percent}
          tint="mint"
          value={`${profileStrength}%`}
          label="Profile Strength"
          sub={
            incompleteCount > 0
              ? `${incompleteCount} item${incompleteCount === 1 ? "" : "s"} incomplete`
              : "Complete"
          }
        />
        <StatCard
          icon={FileText}
          tint="grey"
          value={applicationsSent}
          label="Applications Sent"
        />
        <StatCard
          icon={TrendingUp}
          tint="sand"
          value={`${avgMatchScore}%`}
          label="Avg Match Score"
        />
        <StatCard
          icon={Clock}
          tint="lilac"
          value={underReviewCount}
          label="Under Review"
          sub={
            recentApps.find(
              (a) => a.status === "submitted" || a.status === "under_review",
            )?.opportunities?.title
          }
        />
      </div>

      <div className="sd-card">
        <div className="sd-profile-strength__header">
          <div>
            <span className="sd-profile-strength__label">Profile Strength</span>
            <p className="sd-profile-strength__hint">
              {profileStrength >= 90
                ? "Your profile is in great shape."
                : "Add more projects to push past 90% and unlock better matches"}
            </p>
          </div>
          <span className="sd-profile-strength__pct sd-profile-strength__pct--big">
            {profileStrength}%
          </span>
        </div>
        <div className="sd-profile-strength__bar-track">
          <div
            className="sd-profile-strength__bar-fill"
            style={{ width: `${profileStrength}%` }}
          />
        </div>
        <div className="sd-checklist-row">
          {checklist.map((item) => (
            <ChecklistItem
              key={item.label}
              label={item.label}
              done={item.done}
            />
          ))}
        </div>
      </div>

      <div className="sd-two-col-row">
        <div className="sd-card">
          <div className="sd-section-header">
            <h2 className="sd-section-header__title">Top matches for you</h2>
            <button
              className="sd-link-btn"
              onClick={() => onNavigate("opportunities")}
            >
              View all {strongMatchCount} →
            </button>
          </div>

          <TableHeader
            columns={["Company / Role", "Match", "Apply"]}
            variant="match"
          />

          {loading && <p className="sd-empty__label">Loading...</p>}
          {!loading && topMatches.length === 0 && (
            <p className="sd-empty__label">
              No active opportunities yet - check back soon.
            </p>
          )}

          {topMatches.map((m) => (
            <MatchRow
              key={m.opportunity.id}
              opportunity={m.opportunity}
              matchResult={m}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <div className="sd-card">
          <div className="sd-section-header">
            <h2 className="sd-section-header__title">Recent Activity</h2>
            <button
              className="sd-link-btn"
              onClick={() => onNavigate("notifications")}
            >
              View all
            </button>
          </div>

          {activityFeed.length === 0 && (
            <p className="sd-empty__label">No recent activity yet.</p>
          )}

          <div className="sd-activity-list">
            {activityFeed.map((item) => (
              <div key={item.id} className="sd-activity-row">
                <span
                  className="sd-activity-dot"
                  style={{ background: item.color + "22", color: item.color }}
                />
                <div>
                  <div className="sd-activity-text">{item.text}</div>
                  {item.date && (
                    <div className="sd-activity-time">{timeAgo(item.date)}</div>
                  )}
                </div>
                <span className="sd-activity-alert" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sd-card">
        <div className="sd-section-header">
          <h2 className="sd-section-header__title">Recent Applications</h2>
          <button
            className="sd-link-btn"
            onClick={() => onNavigate("applications")}
          >
            View all {recentApps.length} →
          </button>
        </div>
        <TableHeader columns={["Company", "Role", "Date Applied", "Status"]} />
        {!loading && recentApps.length === 0 && (
          <p className="sd-empty__label" style={{ padding: "16px 4px" }}>
            You haven't applied anywhere yet.
          </p>
        )}
        {recentApps.map((app) => (
          <AppRow key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}

/* applications  */

function ApplicationsView({ user }) {
  const [activeTab, setActiveTab] = useState("All");
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

  const tabCounts = useMemo(() => {
    const counts = {};
    for (const app of applications) {
      counts[app.status] = (counts[app.status] || 0) + 1;
    }
    return counts;
  }, [applications]);

  const tabs = ["All", ...Object.keys(APPLICATION_STATUS_LABELS)];
  const filtered =
    activeTab === "All"
      ? applications
      : applications.filter((a) => a.status === activeTab);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === "date") {
      list.sort(
        (a, b) => new Date(b.applied_at ?? 0) - new Date(a.applied_at ?? 0),
      );
    } else {
      list.sort((a, b) => (a.status ?? "").localeCompare(b.status ?? ""));
    }
    return list;
  }, [filtered, sortBy]);

  // "Under Review" in the tab pills covers both a freshly submitted
  // application and one an employer has explicitly marked as under review -
  // summing both status keys here for the subtitle highlight.
  const underReviewCount =
    (tabCounts.submitted ?? 0) + (tabCounts.under_review ?? 0);

  return (
    <div className="sd-applications">
      <div className="sd-applications__header-row">
        <div>
          <h1 className="sd-applications__title">My Applications</h1>
          <p className="sd-applications__sub">
            {loading ? (
              "Loading..."
            ) : (
              <>
                {applications.length} total application
                {applications.length === 1 ? "" : "s"}
                {underReviewCount > 0 && (
                  <>
                    {" · "}
                    <span className="sd-applications__sub-highlight">
                      {underReviewCount} under review
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <div className="sd-sort-toggle">
          <SlidersHorizontal size={13} />
          <span className="sd-sort-toggle__label">Sort by:</span>
          <button
            className={`sd-sort-toggle__btn${sortBy === "date" ? " sd-sort-toggle__btn--active" : ""}`}
            onClick={() => setSortBy("date")}
          >
            Date
          </button>
          <button
            className={`sd-sort-toggle__btn${sortBy === "status" ? " sd-sort-toggle__btn--active" : ""}`}
            onClick={() => setSortBy("status")}
          >
            Status
          </button>
        </div>
      </div>

      <div className="sd-tabs">
        {tabs.map((tab) => {
          const label =
            tab === "All" ? "All" : APPLICATION_STATUS_LABELS[tab].label;
          const count = tab === "All" ? applications.length : tabCounts[tab];
          return (
            <button
              key={tab}
              className={`sd-tab${tab === activeTab ? " sd-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {label}
              {Boolean(count) && <span className="sd-tab__count">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="sd-card">
        <TableHeader columns={["Company", "Role", "Date Applied", "Status"]} />
        {!loading && sorted.length === 0 && (
          <div className="sd-applications-empty">
            <div className="sd-applications-empty__icon">
              <ClipboardList size={22} />
            </div>
            <p className="sd-applications-empty__title">No applications here</p>
            <p className="sd-applications-empty__sub">
              {activeTab === "All"
                ? "You haven't applied anywhere yet."
                : `Applications matching "${activeTab === "All" ? "" : (APPLICATION_STATUS_LABELS[activeTab]?.label ?? activeTab)}" will appear here.`}
            </p>
          </div>
        )}
        {sorted.map((app) => (
          <AppRow key={app.id} app={app} showFeedback />
        ))}
      </div>
    </div>
  );
}

function StudentDashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchVal, setSearchVal] = useState("");

  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  const profileStrength = computeProfileStrength(userProfile);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  const student = {
    name: userProfile?.full_name ?? "Student",
    university: userProfile?.university ?? "University",
    initials: userProfile?.full_name
      ? userProfile.full_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "S",
  };

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="sd-root">
      {/* Sidebar */}
      <aside
        className={`sd-sidebar${sidebarOpen ? "" : " sd-sidebar--collapsed"}`}
      >
        <div className="sd-sidebar__brand">
          <div className="sd-sidebar__brand-inner">
            <img
              src={HireMeLogo}
              alt="HireMe logo"
              className="sd-sidebar__logo-img"
            />
          </div>
        </div>

        <div className="sd-sidebar__nav">
          <div className="sd-sidebar__user">
            <div className="sd-sidebar__avatar">{student.initials}</div>
            {sidebarOpen && (
              <div className="sd-sidebar__user-info">
                <div className="sd-sidebar__user-row">
                  <div>
                    <div className="sd-sidebar__user-name">{student.name}</div>
                    <div className="sd-sidebar__user-sub">
                      Student · {student.university}
                    </div>
                  </div>
                  <span className="sd-sidebar__user-pct">
                    {profileStrength}% profile
                  </span>
                </div>
                <div className="sd-sidebar__progress-track">
                  <div
                    className="sd-sidebar__progress-fill"
                    style={{ width: `${profileStrength}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {NAV_ITEMS.map(({ icon: Icon, label, id }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                className={`sd-nav-btn${active ? " sd-nav-btn--active" : ""}`}
                onClick={() => setActiveNav(id)}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {sidebarOpen && label}
              </button>
            );
          })}
        </div>

        <div className="sd-sidebar__footer">
          {sidebarOpen && (
            <button className="sd-signout-btn" onClick={handleSignOut}>
              <LogOut size={15} />
              Sign out
            </button>
          )}
          <button
            className="sd-collapse-btn"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="sd-main">
        <header className="sd-header">
          <div className="sd-search">
            <Search size={14} color="#94a3b8" />
            <input
              className="sd-search__input"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search jobs, companies..."
            />
          </div>
          <button className="sd-bell-btn">
            <Bell size={16} color="#64748b" />
            <span className="sd-bell-dot" />
          </button>
        </header>

        <main className="sd-content">
          {activeNav === "dashboard" && (
            <DashboardView
              studentName={student.name}
              user={user}
              onNavigate={setActiveNav}
            />
          )}
          {activeNav === "applications" && <ApplicationsView user={user} />}
          {activeNav === "profile" && <ProfileView user={user} />}
          {activeNav === "opportunities" && <OpportunitiesView user={user} />}
          {!["dashboard", "applications", "profile", "opportunities"].includes(
            activeNav,
          ) && (
            <div className="sd-empty">
              <Briefcase size={32} strokeWidth={1.5} />
              <p className="sd-empty__label">
                {NAV_ITEMS.find((n) => n.id === activeNav)?.label} - coming soon
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default StudentDashboard;
