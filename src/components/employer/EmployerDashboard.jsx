import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { signOut } from "../../services/authService";
import { useNavigate } from "react-router-dom";

import "./EmployerDashboard.css";
import Footer from "../layout/footer.jsx";
import "../layout/footer.css";
import JobsView from "./JobsView.jsx";
import CompanyProfileView from "./CompanyProfileView.jsx";
import JobPostingForm from "./JobPostingForm.jsx";
import { getEmployerOpportunities } from "../../services/employerService";

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
  { icon: LayoutDashboard, label: "Dashboard",       id: "dashboard"       },
  { icon: Briefcase,       label: "My Jobs",         id: "jobs"            },
  { icon: Users,           label: "Candidates",      id: "candidates"      },
  { icon: BarChart2,       label: "Analytics",       id: "analytics"       },
  { icon: Building2,       label: "Company Profile", id: "company-profile" },
];



const RECENT_APPLICATIONS = [
  {
    id: 1,
    role: "Junior Full-Stack Developer",
    applicant: "Jaiden Muruvan",
    initials: "JM",
    date: "Today",
    match: 82,
    matchColor: "#16A34A",
  },
  {
    id: 2,
    role: "Marketing Coordinator",
    applicant: "Padi Maifala",
    initials: "PM",
    date: "Today",
    match: 48,
    matchColor: "#DC8F00",
  },
  {
    id: 3,
    role: "Data Analyst Intern",
    applicant: "Tim Chilezi",
    initials: "TC",
    date: "2 Days ago",
    match: 64,
    matchColor: "#DC8F00",
  },
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
      {match}%
    </span>
  );
}




function DashboardView({ employerName, employerId, onNavigate }) {
  const firstName = (employerName ?? "there").split(" ")[0];
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [showPostForm, setShowPostForm] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    const result = await getEmployerOpportunities(employerId);
    if (result.success) setJobs(result.opportunities);
    setLoadingJobs(false);
  }, [employerId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const activeJobs = jobs.filter((j) => j.status === "active");
  const totalApplications = jobs.reduce((sum, j) => sum + j.applicationCount, 0);

  function daysRemaining(deadline) {
    if (!deadline) return "No deadline";
    const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? `${diff} Days` : "Expired";
  }

  return (
    <div className="ed-dashboard">

      <div className="ed-welcome-row">
        <div>
          <h1 className="ed-greeting__title">Welcome, {firstName}</h1>
          <div className="ed-stats-pills">
            <span className="ed-stat-pill">
              <span className="ed-stat-pill__num">{activeJobs.length}</span> Active Jobs
            </span>
            <span className="ed-stat-pill__sep">•</span>
            <span className="ed-stat-pill">
              <span className="ed-stat-pill__num">{totalApplications}</span> Applications
            </span>
          </div>
        </div>

        <button className="ed-post-btn" onClick={() => setShowPostForm(true)}>
          <Plus size={14} /> Post new job
        </button>
      </div>

      <div className="ed-main-grid">
        <div className="ed-left-col">

          {/* Active jobs */}
          <div className="ed-card">
            <div className="ed-card__header">
              <span className="ed-card__title">Active Jobs</span>
              <button className="ed-link-btn" onClick={() => onNavigate("jobs")}>
                View all {jobs.length} →
              </button>
            </div>

            <div className="ed-table-header">
              {["Job Title", "Applications", "Days Remaining", "View"].map((h) => (
                <span key={h} className="ed-table-th">{h}</span>
              ))}
            </div>

            {loadingJobs && <p className="ed-empty__label" style={{ padding: "16px 4px" }}>Loading...</p>}

            {!loadingJobs && activeJobs.length === 0 && (
              <p className="ed-empty__label" style={{ padding: "16px 4px" }}>
                No active jobs yet — post your first one above.
              </p>
            )}

            {activeJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="ed-table-row">
                <span className="ed-table-cell">{job.title}</span>
                <span className="ed-table-cell">{job.applicationCount}</span>
                <span className="ed-table-cell">{daysRemaining(job.deadline)}</span>
                <button className="ed-view-btn" onClick={() => onNavigate("jobs")}>View →</button>
              </div>
            ))}
          </div>

          {/* Recent applications — placeholder until application matching/review is built */}
          <div className="ed-card">
            <div className="ed-card__header">
              <span className="ed-card__title">Recent Applications</span>
            </div>

            <div className="ed-table-header ed-table-header--apps">
              {["Applicant", "Match Score", "Date", "Review"].map((h) => (
                <span key={h} className="ed-table-th">{h}</span>
              ))}
            </div>

            {RECENT_APPLICATIONS.map((app) => (
              <div key={app.id} className="ed-table-row ed-table-row--apps">
                <div className="ed-applicant-cell">
                  <Avatar initials={app.initials} size={28} />
                  <span className="ed-applicant-name">{app.role}</span>
                </div>
                <MatchBadge match={app.match} color={app.matchColor} />
                <span className="ed-table-cell ed-table-cell--muted">{app.date}</span>
                <button className="ed-view-btn">View →</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showPostForm && (
        <JobPostingForm
          employerId={employerId}
          onClose={() => setShowPostForm(false)}
          onSaved={() => {
            setShowPostForm(false);
            loadJobs();
          }}
        />
      )}
    </div>
  );
}



export default function EmployerDashboard() {
  const [activeNav, setActiveNav]   = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchVal, setSearchVal]   = useState("");

  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const employer = {
    name:    userProfile?.full_name    ?? "Employer",
    company: userProfile?.company_name ?? "Software Company",
    initials: userProfile?.full_name
      ? userProfile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
      : "E",
  };

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="ed-root">


      <aside className={`ed-sidebar${sidebarOpen ? "" : " ed-sidebar--collapsed"}`}>

        <div className="ed-sidebar__brand">
          <div className="ed-sidebar__brand-inner">
            <div className="ed-sidebar__logo-mark">H</div>
            {sidebarOpen && (
              <div>
                <div className="ed-sidebar__brand-name">HireMe</div>
                <div className="ed-sidebar__brand-sub">Graduate Ready</div>
              </div>
            )}
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
            <button className="ed-signout-btn" onClick={handleSignOut}>
              Sign out
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
          {activeNav === "company-profile" && <CompanyProfileView user={user} />}
          {!["dashboard", "jobs", "company-profile"].includes(activeNav) && (
            <div className="ed-empty">
              <Briefcase size={32} strokeWidth={1.5} />
              <p className="ed-empty__label">
                {NAV_ITEMS.find((n) => n.id === activeNav)?.label} — coming soon
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
