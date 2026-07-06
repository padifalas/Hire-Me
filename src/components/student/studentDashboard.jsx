import { useState } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { signOut } from "../../services/authService";
import { useNavigate } from "react-router-dom";

import "./StudentDashboard.css";
import Footer from "../layout/footer.jsx";
import "../layout/footer.css";
import ProfileView from "./ProfileView.jsx";

import TakealotLogo from "../../assets/TakealotLogo.png";
import VodacomLogo from "../../assets/VodacomLogo.png";
import BBDLogo from "../../assets/BBDLogo.png";
import DeloitteLogo from "../../assets/DeloitteLogo.png";
import BitLogo from "../../assets/24bitLogo.png";
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
  MapPin,
  Filter,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: Briefcase, label: "Dashboard", id: "dashboard" },
  { icon: Lightbulb, label: "Opportunities", id: "opportunities" },
  { icon: FileText, label: "Applications", id: "applications" },
  { icon: User, label: "Profile", id: "profile" },
  { icon: Bell, label: "Notifications", id: "notifications" },
];

const TOP_MATCHES = [
  {
    id: 1,
    company: "Takealot",
    logoSrc: TakealotLogo,
    role: "Junior Frontend Developer",
    location: "Cape Town",
    match: 85,
    tags: ["React", "JavaScript", "CSS"],
    matchColor: "#16A34A",
  },
  {
    id: 2,
    company: "Vodacom",
    logoSrc: VodacomLogo,
    role: "Graduate Software Engineer",
    location: "Durban",
    match: 70,
    tags: ["Java", "C#", "SQL"],
    matchColor: "#DC8F00",
  },
  {
    id: 3,
    company: "BBD",
    logoSrc: BBDLogo,
    role: "Graduate Software Engineer",
    location: "Johannesburg",
    match: 80,
    tags: ["React", "JavaScript", "CSS"],
    matchColor: "#16A34A",
  },
];

const APPLICATIONS = [
  {
    id: 1,
    role: "Junior Frontend Developer",
    company: "Takealot",
    logoSrc: TakealotLogo,
    days: "2 days ago",
    status: "Interview Requested",
    statusColor: "#DC8F00",
    statusBg: "#E0F0FF",
  },

  {
    id: 2,
    role: "Graduate Software Engineer",
    company: "BBD",
    logoSrc: BBDLogo,
    days: "2 days ago",
    status: "Under Review",
    statusColor: "#F97316",
    statusBg: "#EDE9FE",
  },

  {
    id: 3,
    role: "Data Analyst Intern",
    company: "Deloitte",
    logoSrc: DeloitteLogo,
    days: "7 days ago",
    status: "Rejected",
    statusColor: "#C1121F",
  },
];

const APP_TABS = ["All", "Submitted", "Under Review", "Interview", "Rejected"];
const TAB_COUNTS = {
  All: null,
  Submitted: 2,
  "Under Review": 3,
  Interview: 1,
  Rejected: 3,
};

const APP_NOTIFICATIONS = [
  {
    id: 1,
    role: "Junior Full-Stack Developer",
    company: "Takealot",
    logoSrc: TakealotLogo,
    days: "2 days ago",
    status: "Interview Requested",
    statusColor: "#DC8F00",
    statusBg: "#E0F0FF",
  },

  {
    id: 2,
    role: "Graduate Software Engineer",
    company: "BBD",
    logoSrc: BBDLogo,
    days: "2 days ago",
    status: "Under Review",
    statusColor: "#F97316",
    statusBg: "#ede9fe",
  },

  {
    id: 3,
    role: "Data Analyst Intern",
    company: "Deloitte",
    logoSrc: DeloitteLogo,
    days: "7 days ago",
    status: "Rejected",
    statusColor: "#C1121F",
    statusBg: "#fee2e2",
    aiFeedback:
      "You were in the bottom 30% of applicants. Here are a few suggestions to improve your CV for your next application.",
    aiAction: "3 Free Courses for Data Analysis",
  },

  {
    id: 4,
    role: "Graduate Game Developer",
    company: "24Bit Games",
    logoSrc: BitLogo,
    days: "9 days ago",
    status: "Under Review",
    statusColor: "#DC8F00",
    statusBg: "#ede9fe",
  },
];

/* Small components that will be referenced throughout the student dashboard page */

function CompanyLogo({ src, company, size = 32 }) {
  return (
    <div className="sd-company-logo" style={{ width: size, height: size }}>
      <img src={src} alt={`${company} logo`} className="sd-company-logo__img" />
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

function Tag({ label }) {
  return <span className="sd-tag">{label}</span>;
}

/* Job Card */

function JobCard({ job }) {
  const [applied, setApplied] = useState(false);
  return (
    <div className="sd-job-card">
      <div className="sd-job-card__top">
        <CompanyLogo src={job.logoSrc} company={job.company} size={34} />
        <MatchBadge match={job.match} color={job.matchColor} />
      </div>
      <div>
        <div className="sd-job-card__role">{job.role}</div>
        <div className="sd-job-card__company">{job.company}</div>
      </div>
      <div className="sd-job-card__location">
        <MapPin size={11} />
        {job.location}
      </div>
      <div className="sd-job-card__tags">
        {job.tags.map((t) => (
          <Tag key={t} label={t} />
        ))}
      </div>
      <button
        className={`sd-apply-btn${applied ? " sd-apply-btn--applied" : ""}`}
        onClick={() => setApplied(true)}
      >
        {applied ? "Applied ✓" : "Apply now"}
      </button>
    </div>
  );
}

/* App Row */

function AppRow({ app, showFeedback = false }) {
  return (
    <div className="sd-app-row">
      <div className="sd-app-row__grid">
        <div className="sd-app-row__title-cell">
          <CompanyLogo src={app.logoSrc} company={app.company} size={28} />
          <span className="sd-app-row__role">{app.role}</span>
        </div>
        <div className="sd-app-row__company-cell">
          <CompanyLogo src={app.logoSrc} company={app.company} size={20} />
          <span className="sd-app-row__company-name">{app.company}</span>
        </div>
        <div className="sd-app-row__date">{app.days}</div>
        <StatusBadge
          status={app.status}
          color={app.statusColor}
          bg={app.statusBg}
        />
      </div>

      {showFeedback && app.aiFeedback && (
        <div className="sd-ai-feedback">
          <div className="sd-ai-feedback__inner">
            <span className="sd-ai-feedback__icon">✦</span>
            <div>
              <div className="sd-ai-feedback__title">
                AI Feedback – {app.aiFeedback.split(".")[0]}.
              </div>
              <div className="sd-ai-feedback__body">
                {app.aiFeedback.split(". ").slice(1).join(". ")}
              </div>
            </div>
          </div>
          <button className="sd-ai-feedback__action">{app.aiAction} →</button>
        </div>
      )}
    </div>
  );
}

/*Table header */

function TableHeader() {
  return (
    <div className="sd-table-header">
      {["Job Title", "Company", "Date Applied", "Status"].map((h) => (
        <span key={h} className="sd-table-th">
          {h}
        </span>
      ))}
    </div>
  );
}

/* Dashboard view */

function DashboardView({ studentName }) {
  const firstName = (studentName ?? "there").split("")[0];
  return (
    <div className="sd-dashboard">
      <div>
        <h1 className="sd-greeting__title">Good morning, {firstName}</h1>
        <p className="sd-greeting__sub">
          5 new opportunities match your profile this week
        </p>
      </div>

      <div className="sd-card">
        <div className="sd-profile-strength__header">
          <span className="sd-profile-strength__label">
            Profile Strength —{" "}
            <span className="sd-profile-strength__pct">72%</span>
          </span>
          <button className="sd-upload-btn">
            <Upload size={13} /> Upload transcript
          </button>
        </div>
        <div className="sd-profile-strength__bar-track">
          <div className="sd-profile-strength__bar-fill" />
        </div>
        <p className="sd-profile-strength__hint">
          Upload your transcript to improve your profile strength to 90%+
        </p>
      </div>

      <div>
        <div className="sd-section-header">
          <h2 className="sd-section-header__title">Top matches for you</h2>
          <button className="sd-link-btn">View all 12 →</button>
        </div>
        <div className="sd-job-cards">
          {TOP_MATCHES.map((job) => (
            <JobCard key={`${job.id}-${job.company}`} job={job} />
          ))}
        </div>
      </div>

      <div className="sd-card">
        <TableHeader />
        {APPLICATIONS.map((app) => (
          <AppRow key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}

/* Applications view */

function ApplicationsView() {
  const [activeTab, setActiveTab] = useState("All");

  return (
    <div className="sd-applications">
      <div>
        <h1 className="sd-applications__title">My Applications</h1>
        <p className="sd-applications__sub">
          You have a total of 12 applications
        </p>
      </div>

      <div className="sd-card">
        <div className="sd-notif-header">
          <h3 className="sd-notif-header__title">Notifications</h3>
          <button className="sd-link-btn">Mark all as read</button>
        </div>

        <div className="sd-tabs">
          {APP_TABS.map((tab) => (
            <button
              key={tab}
              className={`sd-tab${tab === activeTab ? " sd-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {TAB_COUNTS[tab] && (
                <span className="sd-tab__count">{TAB_COUNTS[tab]}</span>
              )}
            </button>
          ))}
          <button className="sd-filter-btn">
            <Filter size={13} /> Filter
          </button>
        </div>

        <TableHeader />
        {APP_NOTIFICATIONS.map((app) => (
          <AppRow key={app.id} app={app} showFeedback />
        ))}
      </div>
    </div>
  );
}

/* Root component */

function StudentDashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchVal, setSearchVal] = useState("");

  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  // will get real data f
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
            <DashboardView studentName={student.name} />
          )}
          {activeNav === "applications" && <ApplicationsView />}
          {activeNav === "profile" && <ProfileView user={user} />}
          {!["dashboard", "applications", "profile"].includes(activeNav) && (
            <div className="sd-empty">
              <Briefcase size={32} strokeWidth={1.5} />
              <p className="sd-empty__label">
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

export default StudentDashboard;
