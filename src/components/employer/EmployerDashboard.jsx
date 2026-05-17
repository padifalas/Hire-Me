import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { signOut } from "../../services/authService";
import { useNavigate } from "react-router-dom";

import "./EmployerDashboard.css";
import Footer from "../layout/footer.jsx";
import "../layout/footer.css";

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



const ACTIVE_JOBS = [
  { id: 1, title: "Junior Full-Stack Developer",  applications: 18, daysRemaining: 14 },
  { id: 2, title: "Marketing Coordinator",        applications: 11, daysRemaining: 14 },
  { id: 3, title: "Data Analyst Intern",          applications: 8,  daysRemaining: 14 },
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




function DashboardView({ employerName }) {
  const firstName = (employerName ?? "there").split(" ")[0];

  return (
    <div className="ed-dashboard">


      <div className="ed-welcome-row">
        <div>
          <h1 className="ed-greeting__title">Welcome, {firstName}</h1>
          <div className="ed-stats-pills">
            <span className="ed-stat-pill">
              <span className="ed-stat-pill__num">3</span> Active Jobs
            </span>
            <span className="ed-stat-pill__sep">•</span>
            <span className="ed-stat-pill">
              <span className="ed-stat-pill__num">47</span> Applications
            </span>
            <span className="ed-stat-pill__sep">•</span>
            <span className="ed-stat-pill">
              <span className="ed-stat-pill__num">12</span> Interviews
            </span>
          </div>
        </div>

        <button className="ed-post-btn">
          <Plus size={14} /> Post new job
        </button>
      </div>

      <div className="ed-main-grid">
        <div className="ed-left-col">

          {/* Active jobs */}
          <div className="ed-card">
            <div className="ed-card__header">
              <span className="ed-card__title">Active Jobs</span>
              <button className="ed-link-btn">View all 12 →</button>
            </div>

            <div className="ed-table-header">
              {["Job Title", "Applications", "Days Remaining", "View"].map((h) => (
                <span key={h} className="ed-table-th">{h}</span>
              ))}
            </div>

            {ACTIVE_JOBS.map((job) => (
              <div key={job.id} className="ed-table-row">
                <span className="ed-table-cell">{job.title}</span>
                <span className="ed-table-cell">{job.applications}</span>
                <span className="ed-table-cell">{job.daysRemaining} Days</span>
                <button className="ed-view-btn">View →</button>
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
    </div>
  );
}



export default function EmployerDashboard() {
  const [activeNav, setActiveNav]   = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchVal, setSearchVal]   = useState("");

  const { userProfile } = useAuth();
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
            <DashboardView employerName={employer.name} />
          )}
          {activeNav !== "dashboard" && (
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