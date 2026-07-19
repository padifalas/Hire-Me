import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/authContext";
import { signOut } from "../../services/authService";
import { useNavigate } from "react-router-dom";

import "./EmployerDashboard.css";
import Footer from "../layout/footer.jsx";
import "../layout/footer.css";
import JobsView from "./JobsView.jsx";
import CompanyProfileView from "./CompanyProfileView.jsx";
import JobPostingForm from "./JobPostingForm.jsx";
import ApplicantsModal from "./ApplicantsModal.jsx";
import CandidatesView from "./CandidatesView.jsx";
import {
  getEmployerOpportunities,
  getRecentApplicationsForEmployer,
} from "../../services/employerService";
import HireMeLogo from "../../assets/HireMeLogo.png";

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
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Briefcase, label: "My Jobs", id: "jobs" },
  { icon: Users, label: "Candidates", id: "candidates" },
  { icon: BarChart2, label: "Analytics", id: "analytics" },
  { icon: Building2, label: "Company Profile", id: "company-profile" },
];

function Avatar({ initials, size = 32 }) {
  return (
    <div
      className="ed-avatar"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

function MatchBadge({ match, color }) {
  return (
    <span
      className="ed-match-badge"
      style={{
        background: color + "18",
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {match === null || match === undefined || match === "-"
        ? "-"
        : `${match}%`}
    </span>
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

  useEffect(() => {
    loadJobs();
    loadRecentApps();
  }, [loadJobs, loadRecentApps]);

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

  function matchColor(score) {
    if (score === null || score === undefined) return "#94a3b8";
    if (score >= 75) return "#16A34A";
    if (score >= 50) return "#DC8F00";
    return "#DC2626";
  }

  function initialsFor(name) {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "S";
  }

  function StatCard({ icon: Icon, value, label, tint }) {
    return (
      <div className="ed-stat-card">
        <div className={`ed-stat-card__icon ed-stat-card__icon--${tint}`}>
          <Icon size={16} />
        </div>
        <div className="ed-stat-card__value">{value}</div>
        <div className="ed-stat-card__label">{label}</div>
      </div>
    );
  }

  function BeeStatsPanel({ breakdown, totalPooled }) {
    return (
      <div className="ed-card">
        <div className="ed-card__header">
          <span className="ed-card__title">BEE Stats</span>
        </div>
        <p className="ed-bee-sub">{totalPooled} applications pooled</p>
        <div className="ed-bee-bar">
          {breakdown.map((seg) => (
            <span
              key={seg.label}
              className="ed-bee-bar__seg"
              style={{ width: `${seg.pct}%`, background: seg.color }}
            />
          ))}
        </div>
        <div className="ed-bee-legend">
          {breakdown.map((seg) => (
            <div key={seg.label} className="ed-bee-legend__row">
              <span
                className="ed-bee-legend__dot"
                style={{ background: seg.color }}
              />
              <span className="ed-bee-legend__label">{seg.label}</span>
              <span className="ed-bee-legend__pct">{seg.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
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
          <Plus size={14} /> Post new job
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
          <div className="ed-card">
            <div className="ed-card__header">
              <span className="ed-card__title">Active Jobs</span>
              <button
                className="ed-link-btn"
                onClick={() => onNavigate("jobs")}
              >
                View all {jobs.length} →
              </button>
            </div>

            <div className="ed-table-header">
              {["Job Title", "Applications", "Days Remaining", "View"].map(
                (h) => (
                  <span key={h} className="ed-table-th">
                    {h}
                  </span>
                ),
              )}
            </div>

            {loadingJobs && (
              <p className="ed-empty__label" style={{ padding: "16px 4px" }}>
                Loading...
              </p>
            )}

            {!loadingJobs && activeJobs.length === 0 && (
              <p className="ed-empty__label" style={{ padding: "16px 4px" }}>
                No active jobs yet - post your first one above.
              </p>
            )}

            {activeJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="ed-table-row">
                <span className="ed-table-cell">{job.title}</span>
                <span className="ed-table-cell">{job.applicationCount}</span>
                <span className="ed-table-cell">
                  {daysRemaining(job.deadline)}
                </span>
                <button
                  className="ed-view-btn"
                  onClick={() => onNavigate("jobs")}
                >
                  View →
                </button>
              </div>
            ))}
          </div>

          {/* Recent applications */}
          <div className="ed-card">
            <div className="ed-card__header">
              <span className="ed-card__title">Recent Applications</span>
            </div>

            <div className="ed-table-header ed-table-header--apps">
              {["Applicant", "Match Score", "Date", "Review"].map((h) => (
                <span key={h} className="ed-table-th">
                  {h}
                </span>
              ))}
            </div>

            {loadingApps && (
              <p className="ed-empty__label" style={{ padding: "16px 4px" }}>
                Loading...
              </p>
            )}

            {!loadingApps && recentApps.length === 0 && (
              <p className="ed-empty__label" style={{ padding: "16px 4px" }}>
                No applications yet.
              </p>
            )}

            {recentApps.map((app) => (
              <div key={app.id} className="ed-table-row ed-table-row--apps">
                <div className="ed-applicant-cell">
                  <Avatar
                    initials={initialsFor(app.student?.full_name)}
                    size={28}
                  />
                  <span className="ed-applicant-name">
                    {app.student?.full_name ?? "Student"} -{" "}
                    {app.opportunities?.title ?? "Opportunity"}
                  </span>
                </div>
                <MatchBadge
                  match={app.match_score ?? "-"}
                  color={matchColor(app.match_score)}
                />
                <span className="ed-table-cell ed-table-cell--muted">
                  {new Date(app.applied_at).toLocaleDateString()}
                </span>
                <button
                  className="ed-view-btn"
                  onClick={() => setReviewingApp(app)}
                >
                  Review →
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="ed-right-col">
          <BeeStatsPanel
            breakdown={beeBreakdown}
            totalPooled={beeTotalPooled}
          />
        </div>
      </div>

      {showPostForm && (
        <JobPostingForm
          employerId={employerId}
          onClose={() => setShowPostForm(false)}
          onSaved={(newJob) => {
            setShowPostForm(false);
            if (newJob)
              setJobs((prev) => [{ ...newJob, applicationCount: 0 }, ...prev]);
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
  );
}

export default function EmployerDashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchVal, setSearchVal] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  // prevents that fucky JobsView/CompanyProfileView/DashboardView from ever receiving
  //  null employerId on a hard refresh
  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  if (loading || !user) return null;

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

  return (
    <div className="ed-root">
      <aside
        className={`ed-sidebar${sidebarOpen ? "" : " ed-sidebar--collapsed"}`}
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

        <div className="ed-sidebar__nav">
          <div className="ed-sidebar__user">
            <div className="ed-sidebar__avatar">{employer.initials}</div>
            {sidebarOpen && (
              <div>
                <div className="ed-sidebar__user-name">{employer.name}</div>
                <div className="ed-sidebar__user-sub">
                  Employer · {employer.company}
                </div>
              </div>
            )}
          </div>

          {NAV_ITEMS.map(({ icon: Icon, label, id }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                className={`ed-nav-btn${active ? " ed-nav-btn--active" : ""}`}
                onClick={() => setActiveNav(id)}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {sidebarOpen && label}
              </button>
            );
          })}
        </div>

        <div className="ed-sidebar__footer">
          {sidebarOpen && (
            <button
              className="ed-signout-btn"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          )}
          <button
            className="ed-collapse-btn"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <Menu size={18} />
          </button>
        </div>
      </aside>

      <div className="ed-main">
        <header className="ed-header">
          <div className="ed-search">
            <Search size={14} color="#94a3b8" />
            <input
              className="ed-search__input"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search candidates, jobs..."
            />
          </div>
          <button className="ed-bell-btn">
            <Bell size={16} color="#64748b" />
            <span className="ed-bell-dot" />
          </button>
        </header>

        <main className="ed-content">
          {activeNav === "dashboard" && (
            <DashboardView
              employerName={employer.name}
              employerId={user?.id}
              onNavigate={setActiveNav}
            />
          )}
          {activeNav === "jobs" && <JobsView employerId={user?.id} />}
          {activeNav === "candidates" && <CandidatesView />}
          {activeNav === "company-profile" && (
            <CompanyProfileView user={user} />
          )}
          {!["dashboard", "jobs", "candidates", "company-profile"].includes(
            activeNav,
          ) && (
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
    </div>
  );
}
