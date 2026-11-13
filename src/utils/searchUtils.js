// Shared helpers for the header search bar on both dashboards.
// Pure functions only: the dashboards own the data and the navigation.

import { Briefcase, GraduationCap, ClipboardList } from "lucide-react";

export function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim();
}

// True when the query is empty, or any of the fields contains it.
export function matches(query, ...fields) {
  const q = normalize(query);
  if (!q) return true;
  return fields.flat().some((f) => normalize(f).includes(q));
}

// Extra words that should also find a page (typing "stats" finds Analytics).
const PAGE_KEYWORDS = {
  dashboard: ["home", "overview"],
  jobs: ["postings", "vacancies", "roles"],
  candidates: ["students", "graduates", "talent"],
  analytics: ["stats", "insights", "metrics", "bee"],
  "company-profile": ["company", "logo", "organisation"],
  notifications: ["alerts", "updates"],
  profile: ["account", "personal details"],
  opportunities: ["jobs", "matches", "vacancies", "internships"],
  applications: ["applied", "status"],
};

function rank(label, q) {
  const l = normalize(label);
  if (l.startsWith(q)) return 0;
  if (l.split(/\s+/).some((w) => w.startsWith(q))) return 1;
  return 2;
}

// pages: [{ id, label, icon }] (the dashboards' NAV_ITEMS already have this shape)
function pageItems(query, pages) {
  const q = normalize(query);
  return pages
    .filter((p) => matches(q, p.label, PAGE_KEYWORDS[p.id] ?? []))
    .sort((a, b) => rank(a.label, q) - rank(b.label, q))
    .slice(0, 4)
    .map((p) => ({
      key: `page-${p.id}`,
      label: p.label,
      hint: "Go to page",
      Icon: p.icon,
      action: { type: "page", id: p.id },
    }));
}

function group(id, label, items) {
  return { id, label, items };
}

export function buildEmployerSearchGroups(query, { pages, jobs, candidates }) {
  if (!normalize(query)) return [];

  const jobItems = (jobs ?? [])
    .filter((j) => matches(query, j.title, j.location))
    .slice(0, 4)
    .map((j) => ({
      key: `job-${j.id}`,
      label: j.title,
      hint: [j.location, j.status].filter(Boolean).join(" · "),
      Icon: Briefcase,
      action: { type: "job", id: j.id, title: j.title },
    }));

  const candidateItems = (candidates ?? [])
    .filter((c) => matches(query, c.full_name, c.university, c.degree_program))
    .slice(0, 4)
    .map((c) => ({
      key: `candidate-${c.id}`,
      label: c.full_name,
      hint: [c.degree_program, c.university].filter(Boolean).join(" · "),
      Icon: GraduationCap,
      action: { type: "candidate", id: c.id, name: c.full_name },
    }));

  return [
    group("pages", "Pages", pageItems(query, pages)),
    group("jobs", "Your jobs", jobItems),
    group("candidates", "Candidates", candidateItems),
  ].filter((g) => g.items.length > 0);
}

export function buildStudentSearchGroups(
  query,
  { pages, opportunities, applications },
) {
  if (!normalize(query)) return [];

  const opportunityItems = (opportunities ?? [])
    .filter((o) =>
      matches(query, o.title, o.employer?.company_name, o.location),
    )
    .slice(0, 4)
    .map((o) => ({
      key: `opportunity-${o.id}`,
      label: o.title,
      hint: [o.employer?.company_name, o.location].filter(Boolean).join(" · "),
      Icon: Briefcase,
      action: { type: "opportunity", id: o.id, title: o.title },
    }));

  const applicationItems = (applications ?? [])
    .filter((a) =>
      matches(query, a.opportunities?.title, a.employer?.company_name),
    )
    .slice(0, 4)
    .map((a) => ({
      key: `application-${a.id}`,
      label: a.opportunities?.title ?? "Application",
      hint: ["Applied", a.employer?.company_name].filter(Boolean).join(" · "),
      Icon: ClipboardList,
      action: { type: "application", id: a.id },
    }));

  return [
    group("pages", "Pages", pageItems(query, pages)),
    group("opportunities", "Opportunities", opportunityItems),
    group("applications", "Your applications", applicationItems),
  ].filter((g) => g.items.length > 0);
}
