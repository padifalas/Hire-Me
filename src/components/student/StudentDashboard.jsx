import { useState, useEffect, useMemo, useCallback } from "react";

import { useAuth } from "../../contexts/authContext.jsx";
import useDialog from "../../hooks/useDialog.js";
import { signOut } from "../../services/authService.js";
import { useNavigate } from "react-router-dom";
import { getStudentProfile } from "../../services/documentService.js";
import {
  getActiveOpportunities,
  getStudentApplicationsWithDetails,
  computeMatchScore,
  APPLICATION_STATUS_LABELS,
} from "../../services/opportunityService.js";

import "./StudentDashboard.css";

import StatStrip from "../shared/StatStrip.jsx";
import "../shared/dashboard-refresh.css";
import Footer from "../layout/footer.jsx";
import "../layout/footer.css";
import ProfileView from "./ProfileView.jsx";
import OpportunitiesView from "./OpportunitiesView.jsx";
import HireMeLogo2 from "../../assets/HireMeLogo2.png";
import ApplicationsView from "./ApplicationsView.jsx";

import ProfileReminder from "./ProfileReminder.jsx";
import "./ProfileReminder.css";

import NotificationsBell from "../shared/NotificationsBell.jsx";
import NotificationToast from "../shared/NotificationToast.jsx";
import NotificationsView from "../shared/NotificationsView.jsx";
import { filterByRange } from "../../utils/notificationUtils.js";
import { useNotifications } from "../../contexts/notificationContext.jsx";
import useProfileCompletion from "../../hooks/useProfileCompletion.js";
import ConfirmDialog from "../shared/ConfirmDialog.jsx";

import GlobalSearch from "../shared/GlobalSearch.jsx";
import useSearchIndex from "../../hooks/useSearchIndex.js";
import { buildStudentSearchGroups, matches } from "../../utils/searchUtils.js";

import {
  Briefcase,
  Lightbulb,
  FileText,
  User,
  Bell,
  Menu,
  Upload,
  Building2,
  Percent,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  Sparkles,
  LogOut,
  X,
} from "lucide-react";
import { Activity } from "react";

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

// matches the real output of the generate-rejection-feedback Edge Function
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

function DashboardView({ studentName, user, onNavigate, onOpenNotification }) {
  const firstName = (studentName ?? "there").split(" ")[0];
  const {
    notifications,
    loading: notificationsLoading,
    setRead,
  } = useNotifications();

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
    () => filterByRange(notifications, "today").slice(0, 5),
    [notifications],
  );

  function handleActivityClick(item) {
    if (!item.read) setRead(item.id, true);
    onOpenNotification(item);
  }

  return (
    <>
      {" "}
      <ProfileReminder
        userId={user.id}
        profile={profile}
        onGoToProfile={() => onNavigate("profile")}
      />
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
              <span className="sd-stat-pill__num">{underReviewCount}</span>{" "}
              Under Review
            </span>
          </div>
        </div>

        <StatStrip
          items={[
            {
              tone: "sage",
              kind: "ring",
              visual: { pct: profileStrength },
              value: `${profileStrength}%`,
              label: "Profile",
              note: incompleteCount
                ? `${incompleteCount} to finish`
                : "Complete",
            },
            {
              tone: "sand",
              kind: "dots",
              value: applicationsSent,
              label: "Applied",
              visual: {
                colors: recentApps.map(
                  (a) =>
                    (
                      APPLICATION_STATUS_LABELS[a.status] ??
                      APPLICATION_STATUS_LABELS.submitted
                    ).color,
                ),
              },
            },
            {
              tone: "clay",
              kind: "arc",
              visual: { pct: avgMatchScore },
              value: `${avgMatchScore}%`,
              label: "Avg match",
            },
            {
              tone: "lilac",
              kind: "pulse",
              visual: { active: underReviewCount > 0 },
              value: underReviewCount,
              label: "In review",
              note: recentApps.find(
                (a) => a.status === "submitted" || a.status === "under_review",
              )?.opportunities?.title,
            },
          ]}
        />

        <div className="sd-card">
          <div className="sd-profile-strength__header">
            <div>
              <span className="sd-profile-strength__label">
                Profile Strength
              </span>
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

            {!notificationsLoading && activityFeed.length === 0 && (
              <p className="sd-empty__label">Nothing new today.</p>
            )}

            <ul className="sd-activity-list">
              {activityFeed.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="sd-activity-row sd-activity-row--button"
                    onClick={() => handleActivityClick(item)}
                  >
                    <span
                      className="sd-activity-dot"
                      aria-hidden="true"
                      style={{
                        background: item.read
                          ? "#cbd5e1"
                          : "var(--color-primary-active)",
                      }}
                    />
                    <span className="sd-activity-content">
                      <span className="sd-activity-text">
                        {!item.read && (
                          <span className="sr-only">Unread: </span>
                        )}
                        {item.body || item.title}
                      </span>
                      <span className="sd-activity-time">
                        {timeAgo(item.created_at)}
                      </span>
                    </span>
                    {!item.read && (
                      <span className="sd-activity-alert" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
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
          <TableHeader
            columns={["Company", "Role", "Date Applied", "Status"]}
          />
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
    </>
  );
}

function ConfirmSignOutDialog({ signingOut, onCancel, onConfirm }) {
  const ref = useDialog({
    onClose: onCancel,
    closeDisabled: signingOut,
  });

  return (
    <div
      className="sd-signout-popover-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !signingOut) onCancel();
      }}
    >
      <div
        ref={ref}
        className="sd-signout-popover"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sd-signout-title"
        tabIndex={-1}
      >
        <p className="sd-signout-popover__text" id="sd-signout-title">
          Are you sure you want to sign out?
        </p>

        <div className="sd-signout-popover__actions">
          <button
            className="sd-signout-confirm__no"
            onClick={onCancel}
            disabled={signingOut}
          >
            Cancel
          </button>

          <button
            className="sd-signout-confirm__yes"
            onClick={onConfirm}
            disabled={signingOut}
          >
            {signingOut ? "Signing out..." : "Yes, sign out"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const expanded = sidebarOpen || mobileNavOpen;

  const [searchVal, setSearchVal] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const { unreadCount } = useNotifications();
  const [highlightApplicationId, setHighlightApplicationId] = useState(null);
  const clearHighlight = useCallback(() => setHighlightApplicationId(null), []);

  // Pinned "Complete your profile" item for the bell panel
  const { strength: setupStrength, needsAttention } = useProfileCompletion({
    role: "student",
    userId: user?.id,
    refreshKey: activeNav,
  });

  const pinnedItems = needsAttention
    ? [
        {
          id: "pinned-profile",
          type: "profile_incomplete",
          title: "Complete your profile",
          body: `Your profile is ${setupStrength}% complete. A stronger profile gets you better matches.`,
          onClick: () => navigateTo("profile"),
        },
      ]
    : [];

  function navigateTo(id, { query = "" } = {}) {
    setActiveNav(id);
    setSearchVal(query);
    setMobileNavOpen(false);
  }

  const { index: searchIndex, ensureLoaded: loadSearchIndex } = useSearchIndex(
    async () => {
      if (!user?.id) return null;
      const [opps, apps] = await Promise.all([
        getActiveOpportunities({}),
        getStudentApplicationsWithDetails(user.id),
      ]);
      return {
        opportunities: opps.success ? opps.opportunities : [],
        applications: apps.success ? apps.applications : [],
      };
    },
    { opportunities: [], applications: [] },
  );

  const searchGroups = useMemo(
    () =>
      buildStudentSearchGroups(searchVal, { pages: NAV_ITEMS, ...searchIndex }),
    [searchVal, searchIndex],
  );

  function handleSearchSelect(item) {
    const a = item.action;
    if (a.type === "opportunity") {
      // Opportunities has no single-item page, so land on the list already filtered to it.
      navigateTo("opportunities", { query: a.title });
    } else if (a.type === "application") {
      // Same deep link the notifications use: Applications scrolls to it and highlights it.
      setHighlightApplicationId(a.id);
      navigateTo("applications");
    } else {
      navigateTo(a.id);
    }
    requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus(),
    );
  }

  // Where a notification takes the student. `application_status` rows carry
  // link_type "application" + the application id.
  function handleOpenNotification(notification) {
    if (notification.link_type === "application" && notification.link_id) {
      setHighlightApplicationId(notification.link_id);
      setActiveNav("applications");
      return;
    }
    navigateTo("notifications");
  }

  useEffect(() => {
    if (!mobileNavOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileNavOpen]);

  const profileStrength = computeProfileStrength(userProfile);

  // Auth + role guard now lives in <ProtectedRoute> (src/components/auth/
  // ProtectedRoute.jsx) - this component only ever mounts once that has
  // already confirmed a signed-in student.

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
    if (signingOut) return;
    setSigningOut(true);
    try {
      const result = await signOut();
      if (!result.success) {
        console.error("Sign out failed:", result.error);
      }
    } finally {
      navigate("/");
    }
  }

  return (
    <div className="sd-root">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {mobileNavOpen && (
        <div
          className="sd-sidebar-overlay"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Sidebar */}
      <aside
        id="sd-sidebar"
        className={`sd-sidebar${sidebarOpen ? "" : " sd-sidebar--collapsed"}${mobileNavOpen ? " sd-sidebar--mobile-open" : ""}`}
      >
        <div className="sd-sidebar__brand">
          <div className="sd-sidebar__brand-inner">
            <img
              src={HireMeLogo2}
              alt="HireMe logo"
              className="sd-sidebar__logo-img"
            />
          </div>
        </div>

        <nav className="sd-sidebar__nav" aria-label="Main">
          <div className="sd-sidebar__user">
            <button
              type="button"
              className="sd-sidebar__user-top sd-sidebar__user-btn"
              onClick={() => navigateTo("profile")}
              aria-label="Go to your profile"
            >
              <div className="sd-sidebar__avatar">
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt=""
                    className="sd-sidebar__avatar-img"
                  />
                ) : (
                  student.initials
                )}
              </div>
              {expanded && (
                <div className="sd-sidebar__user-info">
                  <div className="sd-sidebar__user-name">{student.name}</div>
                  <div className="sd-sidebar__user-sub">
                    Student · {student.university}
                  </div>
                </div>
              )}
            </button>

            <div
              className="sd-meter"
              role="progressbar"
              aria-label="Profile strength"
              aria-valuenow={profileStrength}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {expanded && (
                <div className="sd-meter__row">
                  <span className="sd-meter__label">Profile strength</span>
                  <span className="sd-meter__pct">{profileStrength}%</span>
                </div>
              )}
              <div className="sd-meter__track">
                <div
                  className={`sd-meter__fill${profileStrength >= 100 ? " sd-meter__fill--complete" : ""}`}
                  style={{ width: `${profileStrength}%` }}
                />
              </div>
            </div>
          </div>

          {NAV_ITEMS.map(({ icon: Icon, label, id }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                className={`sd-nav-btn${active ? " sd-nav-btn--active" : ""}`}
                onClick={() => {
                  navigateTo(id);
                }}
                aria-current={active ? "page" : undefined}
                aria-label={expanded ? undefined : label}
                title={expanded ? undefined : label}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.8}
                  aria-hidden="true"
                />
                {expanded && label}
                {expanded && id === "notifications" && unreadCount > 0 && (
                  <span className="ed-nav-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sd-sidebar__footer">
          {sidebarOpen && (
            <button
              className="sd-signout-btn"
              onClick={() => setConfirmingSignOut(true)}
              disabled={signingOut}
            >
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

          <button
            className="sd-drawer-close"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="sd-main">
        <header className="sd-header">
          <button
            className="sd-menu-btn"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileNavOpen}
            aria-controls="sd-sidebar"
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          <GlobalSearch
            className="sd-search"
            inputClassName="sd-search__input"
            value={searchVal}
            onChange={setSearchVal}
            groups={searchGroups}
            onSelect={handleSearchSelect}
            onActivate={loadSearchIndex}
            placeholder="Search pages, jobs, applications..."
            ariaLabel="Search pages, opportunities and applications"
          />

          <NotificationsBell
            buttonClassName="sd-bell-btn"
            badgeClassName="sd-bell-badge"
            pinned={pinnedItems}
            onOpenNotification={handleOpenNotification}
            onViewAll={() => navigateTo("notifications")}
          />
        </header>

        <main id="main-content" tabIndex={-1} className="sd-content">
          <div key={activeNav} className="page-fade">
            {activeNav === "dashboard" && (
              <DashboardView
                studentName={student.name}
                user={user}
                onNavigate={navigateTo}
                onOpenNotification={handleOpenNotification}
              />
            )}
            {activeNav === "applications" && (
              <ApplicationsView
                user={user}
                searchQuery={searchVal}
                highlightId={highlightApplicationId}
                onHighlightHandled={clearHighlight}
              />
            )}
            {activeNav === "notifications" && (
              <NotificationsView onOpenNotification={handleOpenNotification} />
            )}
            {activeNav === "profile" && <ProfileView user={user} />}
            {activeNav === "opportunities" && (
              <OpportunitiesView
                user={user}
                search={searchVal}
                onSearchChange={setSearchVal}
              />
            )}
            {![
              "dashboard",
              "applications",
              "profile",
              "opportunities",
              "notifications",
            ].includes(activeNav) && (
              <div className="sd-empty">
                <Briefcase size={32} strokeWidth={1.5} />
                <p className="sd-empty__label">
                  {NAV_ITEMS.find((n) => n.id === activeNav)?.label} - coming
                  soon
                </p>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
      <NotificationToast onOpenNotification={handleOpenNotification} />
      {confirmingSignOut && (
        <ConfirmDialog
          title="Sign out"
          description="Are you sure you want to sign out?"
          confirmLabel="Yes, sign out"
          busyLabel="Signing out..."
          cancelLabel="Cancel"
          onConfirm={handleSignOut}
          onCancel={() => setConfirmingSignOut(false)}
          busy={signingOut}
        />
      )}
    </div>
  );
}

export default StudentDashboard;
