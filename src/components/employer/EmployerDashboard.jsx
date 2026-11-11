import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/authContext";
import { signOut } from "../../services/authService";
import { useNavigate } from "react-router-dom";

import ConfirmDialog from "../shared/ConfirmDialog.jsx";
import {
  matchColor,
  getInitials,
  avatarStyleFor,
} from "../../utils/uiHelpers.js";

import "./EmployerDashboard.css";
import Footer from "../layout/footer.jsx";
import "../layout/footer.css";
import JobsView from "./JobsView.jsx";
import CompanyProfileView from "./CompanyProfileView.jsx";
import JobPostingForm from "./JobPostingForm.jsx";
import ApplicantsModal from "./ApplicantsModal.jsx";
import CandidatesView from "./CandidatesView.jsx";
import EmployerProfileView from "./EmployerProfileView.jsx";
import AnalyticsView from "./AnalyticsView.jsx";
import {
  getEmployerOpportunities,
  getRecentApplicationsForEmployer,
  getEmployerBeeStats,
  BEE_MIN_POOL_SIZE,
} from "../../services/employerService";
import HireMeLogo from "../../assets/HireMeLogo.png";

import CompanyProfileReminder from "./CompanyProfileReminder.jsx";
import "../student/ProfileReminder.css"; // shared styles with student reminder toast

import {
  LayoutDashboard,
  Briefcase,
  Users,
  BarChart2,
  Building2,
  Bell,
  Menu,
  Search,
  Plus,
  FileText,
  Sparkles,
  X,
  LogOut,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Briefcase, label: "My Jobs", id: "jobs" },
  { icon: Users, label: "Candidates", id: "candidates" },
  { icon: BarChart2, label: "Analytics", id: "analytics" },
  { icon: Building2, label: "Company Profile", id: "company-profile" },
];

function Avatar({ initials, id, size = 32 }) {
  const avatarStyle = avatarStyleFor(id);

  return (
    <div
      className="ed-avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: avatarStyle.bg,
        color: avatarStyle.color,
      }}
    >
      {initials}
    </div>
  );
}

function MatchBadge({ match, color }) {
  const empty = match === null || match === undefined || match === "-";
  return (
    <span
      className="ed-match-badge"
      style={{
        background: color + "18",
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {empty ? (
        "-"
      ) : (
        <>
          {match}%<span className="sr-only"> match</span>
        </>
      )}
      {empty && <span className="sr-only">No score</span>}
    </span>
  );
}

function StatCard({ icon: Icon, value, label, tint }) {
  return (
    <div className="ed-stat-card">
      <div
        className={`ed-stat-card__icon ed-stat-card__icon--${tint}`}
        aria-hidden="true"
      >
        <Icon size={16} />
      </div>
      <div className="ed-stat-card__value">{value}</div>
      <div className="ed-stat-card__label">{label}</div>
    </div>
  );
}

function BeeStatsPanel({ breakdown, totalPooled, loading }) {
  const hasEnoughData = totalPooled >= BEE_MIN_POOL_SIZE;

  return (
    <section className="ed-card" aria-labelledby="ed-bee-title">
      <div className="ed-card__header">
        <h2 className="ed-card__title" id="ed-bee-title">
          BEE Stats
        </h2>
      </div>

      {loading ? (
        <p className="ed-bee-empty" role="status">
          Loading BEE statistics
        </p>
      ) : !hasEnoughData ? (
        <div className="ed-bee-empty">
          <p className="ed-bee-empty__title">Not enough data yet</p>
          <p className="ed-bee-empty__hint">
            {totalPooled === 0
              ? "No applications have shared this information yet."
              : `Only ${totalPooled} applications have shared this information so far. We show a breakdown once at least ${BEE_MIN_POOL_SIZE} responses are in, to keep individual answers private.`}
          </p>
        </div>
      ) : (
        <>
          <p className="ed-bee-sub">{totalPooled} applications pooled</p>

          <div className="ed-bee-bar" aria-hidden="true">
            {breakdown.map((seg) => (
              <span
                key={seg.label}
                className="ed-bee-bar__seg"
                style={{ width: `${seg.pct}%`, background: seg.color }}
              />
            ))}
          </div>

          <ul className="ed-bee-legend">
            {breakdown.map((seg) => (
              <li key={seg.label} className="ed-bee-legend__row">
                <span
                  className="ed-bee-legend__dot"
                  aria-hidden="true"
                  style={{ background: seg.color }}
                />
                <span className="ed-bee-legend__label">{seg.label}</span>
                <span className="ed-bee-legend__pct">{seg.pct}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function DashboardView({ employerName, employerId, onNavigate }) {
  const firstName = (employerName ?? "there").split(" ")[0];
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [showPostForm, setShowPostForm] = useState(false);
  const [recentApps, setRecentApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [reviewingApp, setReviewingApp] = useState(null);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    const result = await getEmployerOpportunities(employerId);
    if (result.success) setJobs(result.opportunities);
    setLoadingJobs(false);
  }, [employerId]);

  const loadRecentApps = useCallback(async () => {
    setLoadingApps(true);
    const result = await getRecentApplicationsForEmployer(employerId);
    if (result.success) setRecentApps(result.applications);
    setLoadingApps(false);
  }, [employerId]);

  const activeJobs = jobs.filter((j) => j.status === "active");
  const totalApplications = jobs.reduce(
    (sum, j) => sum + j.applicationCount,
    0,
  );

  function daysRemaining(deadline) {
    if (!deadline) return "No deadline";
    const diff = Math.ceil(
      (new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24),
    );
    return diff >= 0 ? `${diff} Days` : "Expired";
  }

  const interviewCount = recentApps.filter(
    (a) => a.status === "interview",
  ).length;

  const scoredApps = recentApps.filter(
    (a) => a.match_score !== null && a.match_score !== undefined,
  );
  const avgMatchScore = scoredApps.length
    ? Math.round(
        scoredApps.reduce((sum, a) => sum + a.match_score, 0) /
          scoredApps.length,
      )
    : 0;

  const [beeStats, setBeeStats] = useState({ totalPooled: 0, breakdown: {} });
  const [loadingBee, setLoadingBee] = useState(true);

  const loadBeeStats = useCallback(async () => {
    setLoadingBee(true);
    const result = await getEmployerBeeStats(employerId);
    if (result.success) {
      setBeeStats({
        totalPooled: result.totalPooled,
        breakdown: result.breakdown,
      });
    }
    setLoadingBee(false);
  }, [employerId]);

  useEffect(() => {
    loadJobs();
    loadRecentApps();
    loadBeeStats();
  }, [loadJobs, loadRecentApps, loadBeeStats]);

  const beeBreakdown = [
    {
      label: "Black/African",
      pct: beeStats.breakdown.black_african ?? 0,
      color: "#dc4c1e",
    },
    {
      label: "Coloured",
      pct: beeStats.breakdown.coloured ?? 0,
      color: "#f0a500",
    },
    { label: "Indian", pct: beeStats.breakdown.indian ?? 0, color: "#f4c542" },
    { label: "White", pct: beeStats.breakdown.white ?? 0, color: "#d1d5db" },
    { label: "Other", pct: beeStats.breakdown.other ?? 0, color: "#6b7280" },
  ];

  return (
    <>
      <CompanyProfileReminder
        employerId={employerId}
        onGoToProfile={() => onNavigate("company-profile")}
      />

      <div className="ed-dashboard">
        <div className="ed-welcome-row">
          <div>
            <h1 className="ed-greeting__title">Welcome, {firstName}</h1>
            <div className="ed-stats-pills">
              <span className="ed-stat-pill">
                <span className="ed-stat-pill__num">{activeJobs.length}</span>{" "}
                Active Jobs
              </span>
              <span className="ed-stat-pill__sep">•</span>
              <span className="ed-stat-pill">
                <span className="ed-stat-pill__num">{totalApplications}</span>{" "}
                Applications
              </span>
            </div>
          </div>

          <button className="ed-post-btn" onClick={() => setShowPostForm(true)}>
            <Plus size={14} aria-hidden="true" /> Post new job
          </button>
        </div>

        <div className="ed-stat-cards">
          <StatCard
            icon={Briefcase}
            value={activeJobs.length}
            label="Active Jobs"
            tint="rose"
          />
          <StatCard
            icon={FileText}
            value={totalApplications}
            label="Total Applications"
            tint="mint"
          />
          <StatCard
            icon={Users}
            value={interviewCount}
            label="Interviews"
            tint="lilac"
          />
          <StatCard
            icon={Sparkles}
            value={`${avgMatchScore}%`}
            label="Avg. Match Score"
            tint="sand"
          />
        </div>

        <div className="ed-main-grid">
          <div className="ed-left-col">
            {/* Active jobs */}
            <section className="ed-card" aria-labelledby="ed-active-job-title">
              <div className="ed-card__header">
                <h2 className="ed-card__title" id="ed-active-jobs-title">
                  Active Jobs
                </h2>
                <button
                  className="ed-link-btn"
                  onClick={() => onNavigate("jobs")}
                  aria-label={`View all ${jobs.length} jobs`}
                >
                  View all {jobs.length} →
                </button>
              </div>

              <div role="table" aria-label="Active jobs">
                <div className="ed-table-header" role="row">
                  {["Job Title", "Applications", "Days Remaining", "View"].map(
                    (h) => (
                      <span key={h} className="ed-table-th" role="columnheader">
                        {h}
                      </span>
                    ),
                  )}
                </div>
              </div>
              {loadingJobs && (
                <p
                  className="ed-empty__label"
                  role="status"
                  style={{ padding: "16px 4px" }}
                >
                  Loading...
                </p>
              )}

              {!loadingJobs && activeJobs.length === 0 && (
                <p
                  className="ed-empty__label"
                  role="status"
                  style={{ padding: "16px 4px" }}
                >
                  No active jobs yet - post your first one above.
                </p>
              )}

              {activeJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="ed-table-row" role="row">
                  <span className="ed-table-cell" role="cell">
                    {job.title}
                  </span>
                  <span className="ed-table-cell" role="cell">
                    {job.applicationCount}
                  </span>
                  <span className="ed-table-cell" role="cell">
                    {daysRemaining(job.deadline)}
                  </span>
                  <button
                    className="ed-view-btn"
                    aria-label={`View ${job.title}`}
                    onClick={() => onNavigate("jobs")}
                  >
                    View →
                  </button>
                </div>
              ))}
            </section>
          </div>

          <div className="ed-right-col">
            <BeeStatsPanel
              breakdown={beeBreakdown}
              totalPooled={beeStats.totalPooled}
              loading={loadingBee}
            />
          </div>
        </div>

        {/* Recent applications (now full width, below the grid) */}
        <section
          className="ed-card ed-table-card"
          aria-labelledby="ed-recent-apps-title"
        >
          <div className="ed-card__header">
            <h2 className="ed-card__title" id="ed-recent-apps-title">
              Recent Applications
            </h2>
          </div>

          <div className="ed-table-header ed-table-header--apps">
            {["Applicant", "Match Score", "Date", "Review"].map((h) => (
              <span key={h} className="ed-table-th">
                {h}
              </span>
            ))}
          </div>

          {loadingApps && (
            <p className="ed-empty__label ed-table-card__msg" role="status">
              Loading...
            </p>
          )}

          {!loadingApps && recentApps.length === 0 && (
            <p className="ed-empty__label ed-table-card__msg">
              No applications yet.
            </p>
          )}

          {recentApps.map((app) => {
            const name = app.student?.full_name ?? "Student";

            return (
              <div key={app.id} className="ed-table-row ed-table-row--apps">
                <div className="ed-applicant-cell">
                  <Avatar
                    initials={getInitials(name)}
                    id={app.student?.id ?? app.id}
                    size={38}
                  />

                  <div>
                    <div className="ed-applicant-name">{name}</div>
                    <div className="ed-applicant-role">
                      {app.opportunities?.title ?? "Opportunity"}
                    </div>
                  </div>
                </div>

                <MatchBadge
                  match={app.match_score ?? "-"}
                  color={matchColor(app.match_score)}
                />

                <span className="ed-table-cell ed-table-cell--muted">
                  {new Date(app.applied_at).toLocaleDateString()}
                </span>

                <button
                  type="button"
                  className="ed-view-btn"
                  aria-label={`Review application from ${name}`}
                  onClick={() => setReviewingApp(app)}
                >
                  Review →
                </button>
              </div>
            );
          })}
        </section>

        {showPostForm && (
          <JobPostingForm
            employerId={employerId}
            onClose={() => setShowPostForm(false)}
            onSaved={(newJob) => {
              setShowPostForm(false);
              if (newJob)
                setJobs((prev) => [
                  { ...newJob, applicationCount: 0 },
                  ...prev,
                ]);
            }}
          />
        )}

        {reviewingApp && (
          <ApplicantsModal
            opportunityId={reviewingApp.opportunity_id}
            jobTitle={reviewingApp.opportunities?.title}
            highlightApplicationId={reviewingApp.id}
            onClose={() => setReviewingApp(null)}
          />
        )}
      </div>
    </>
  );
}

export default function EmployerDashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchVal, setSearchVal] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarRef = useRef(null);

  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const expanded = sidebarOpen || mobileNavOpen;

  // Auth + role guard now lives in <ProtectedRoute> (src/components/auth/
  // ProtectedRoute.jsx) - this component only ever mounts once that has
  // already confirmed a signed-in employer, so JobsView/CompanyProfileView/
  // DashboardView never see a null employerId here.

  const employer = {
    name: userProfile?.full_name ?? "Employer",
    company: userProfile?.company_name ?? "Software Company",
    initials: userProfile?.full_name
      ? userProfile.full_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "E",
  };

  async function handleSignOut() {
    if (signingOut) return; // guard against double-clicks doin signOut 2wice
    setSigningOut(true);
    try {
      const result = await signOut();
      if (!result.success) {
        console.error("Sign out failed:", result.error);
      }
    } finally {
      // navigate regardless of whether the Supabase call itself succeeded -
      // user/session as soon as it fires
      navigate("/");
    }
  }

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousFocus = document.activeElement;
    const sidebar = sidebarRef.current;

    const focusableElements = sidebar?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    focusableElements?.[0]?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setMobileNavOpen(false);
        return;
      }

      if (e.key === "Tab" && focusableElements?.length) {
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [mobileNavOpen]);

  return (
    <div className="ed-root">
      {mobileNavOpen && (
        <div
          className="ed-sidebar-overlay"
          aria-hidden="true"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        id="ed-sidebar"
        className={`ed-sidebar${expanded ? "" : " ed-sidebar--collapsed"}${mobileNavOpen ? " ed-sidebar--mobile-open" : ""}`}
        role={mobileNavOpen ? "dialog" : undefined}
        aria-modal={mobileNavOpen ? "true" : undefined}
        aria-label={mobileNavOpen ? "Employer navigation" : undefined}
      >
        <div className="ed-sidebar__brand">
          <div className="ed-sidebar__brand-inner">
            <img
              src={HireMeLogo}
              alt="HireMe logo"
              className="ed-sidebar__logo-img"
            />
          </div>
        </div>

        <nav className="ed-sidebar__nav" aria-label="Main navigation">
          <button
            type="button"
            className={`ed-sidebar__user${activeNav === "profile" ? " ed-sidebar__user--active" : ""}`}
            onClick={() => {
              setActiveNav("profile");
              setMobileNavOpen(false);
            }}
            title="My profile"
          >
            <div className="ed-sidebar__avatar">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt=""
                  className="ed-sidebar__avatar-img"
                />
              ) : (
                employer.initials
              )}
            </div>
            {expanded && (
              <div className="ed-sidebar__user-text">
                <div className="ed-sidebar__user-name">{employer.name}</div>
                <div className="ed-sidebar__user-sub">
                  Employer · {employer.company}
                </div>
              </div>
            )}
          </button>

          {NAV_ITEMS.map(({ icon: Icon, label, id }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                className={`ed-nav-btn${active ? " ed-nav-btn--active" : ""}`}
                onClick={() => {
                  setActiveNav(id);
                  setMobileNavOpen(false);
                }}
                title={expanded ? undefined : label}
                aria-label={label}
              >
                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                {expanded && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="ed-sidebar__footer">
          {expanded && (
            <button
              type="button"
              className="ed-signout-btn"
              onClick={() => setConfirmingSignOut(true)}
              disabled={signingOut}
              aria-label="Sign out"
              title={!expanded ? "Sign out" : undefined}
            >
              <LogOut size={15} aria-hidden="true" />
              {expanded && "Sign Out"}
            </button>
          )}

          <button
            type="button"
            className="ed-collapse-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </aside>

      <a href="#ed-main" className="skip-link">
        Skip to main content
      </a>
      <div className="ed-main">
        <header className="ed-header">
          <button
            type="button"
            className="ed-menu-btn"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            aria-controls="ed-sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="ed-search" role="search">
            <Search size={14} color="#94a3b8" aria-hidden="true" />
            <input
              className="ed-search__input"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search candidates, jobs..."
              aria-label="Search candidates and jobs"
            />
          </div>

          <button
            type="button"
            className="ed-bell-btn"
            aria-label="Notifications"
          >
            <Bell size={16} color="#64748b" aria-hidden="true" />
            <span className="ed-bell-dot" aria-hidden="true" />
          </button>
        </header>

        <main id="ed-main" className="ed-content" tabIndex={-1}>
          {activeNav === "dashboard" && (
            <DashboardView
              employerName={employer.name}
              employerId={user?.id}
              onNavigate={setActiveNav}
            />
          )}
          {activeNav === "profile" && <EmployerProfileView user={user} />}
          {activeNav === "jobs" && <JobsView employerId={user?.id} />}
          {activeNav === "candidates" && <CandidatesView />}
          {activeNav === "analytics" && <AnalyticsView employerId={user?.id} />}
          {activeNav === "company-profile" && (
            <CompanyProfileView user={user} />
          )}
          {![
            "dashboard",
            "profile",
            "jobs",
            "candidates",
            "analytics",
            "company-profile",
          ].includes(activeNav) && (
            <div className="ed-empty">
              <Briefcase size={32} strokeWidth={1.5} />
              <p className="ed-empty__label">
                {NAV_ITEMS.find((n) => n.id === activeNav)?.label} - coming soon
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
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
