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
} from "lucide-react";

const NAV_ITEMS = [
  { icon: Briefcase, label: "Dashboard", id: "dashboard" },
  { icon: Lightbulb, label: "Opportunities", id: "opportunities" },
  { icon: FileText, label: "Applications", id: "applications" },
  { icon: User, label: "Profile", id: "profile" },
  { icon: Bell, label: "Notifications", id: "notifications" },
];

/* Small components used throughout the student dashboard page */

function CompanyLogo({ src, company, size = 32 }) {
  return (
    <div className="sd-company-logo" style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={`${company} logo`}
          className="sd-company-logo__img"
        />
      ) : (
        <Building2 size={Math.round(size * 0.5)} color="#94a3b8" />
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
      {match}% match
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
            <div className="sd-app-row__role">{opportunity.title}</div>
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

  return (
    <div className="sd-app-row">
      <div className="sd-app-row__grid">
        <div className="sd-app-row__title-cell">
          <CompanyLogo
            src={app.employer?.logo_url}
            company={company}
            size={28}
          />
          <span className="sd-app-row__role">{role}</span>
        </div>
        <div className="sd-app-row__company-cell">
          <CompanyLogo
            src={app.employer?.logo_url}
            company={company}
            size={20}
          />
          <span className="sd-app-row__company-name">{company}</span>
        </div>
        <div className="sd-app-row__date">
          {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "-"}
        </div>
        <StatusBadge
          status={statusMeta.label}
          color={statusMeta.color}
          bg={statusMeta.bg}
        />
      </div>

      {showFeedback && app.status === "rejected" && app.rejection_feedback && (
        <div className="sd-ai-feedback">
          <div className="sd-ai-feedback__inner">
            <span className="sd-ai-feedback__icon">✦</span>
            <div>
              <div className="sd-ai-feedback__title">
                Feedback from the employer
              </div>
              <div className="sd-ai-feedback__body sd-ai-feedback__body--wrap">
                {renderFeedbackText(app.rejection_feedback)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/*table header */

function TableHeader({ columns }) {
  return (
    <div className="sd-table-header">
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

          <TableHeader columns={["Company", "Role", "Match", "Apply"]} />

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

  return (
    <div className="sd-applications">
      <div>
        <h1 className="sd-applications__title">My Applications</h1>
        <p className="sd-applications__sub">
          {loading
            ? "Loading..."
            : `You have a total of ${applications.length} application${applications.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="sd-card">
        <div className="sd-notif-header">
          <h3 className="sd-notif-header__title">Applications</h3>
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
                {Boolean(count) && (
                  <span className="sd-tab__count">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <TableHeader columns={["Company", "Role", "Date Applied", "Status"]} />
        {!loading && filtered.length === 0 && (
          <p className="sd-empty__label" style={{ padding: "16px 4px" }}>
            No applications here yet.
          </p>
        )}
        {filtered.map((app) => (
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
              <div>
                <div className="sd-sidebar__user-name">{student.name}</div>
                <div className="sd-sidebar__user-sub">
                  Student · {student.university}
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
              Sign out
            </button>
          )}
          <button
            className="sd-collapse-btn"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <Menu size={18} />
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
