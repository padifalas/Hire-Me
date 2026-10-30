import { Link, NavLink } from "react-router-dom";
import { LEGAL } from "../../config/legalConfig";
import "./Legal.css";

const DOCS = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/cookies", label: "Cookie Policy" },
];

export default function LegalLayout({ title, intro, sections }) {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="legal-brand">
          {LEGAL.appName}
        </Link>
        <nav className="legal-tabs" aria-label="Legal documents">
          {DOCS.map((d) => (
            <NavLink
              key={d.to}
              to={d.to}
              className={({ isActive }) =>
                isActive ? "legal-tab legal-tab--active" : "legal-tab"
              }
            >
              {d.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="legal-main">
        <aside className="legal-toc" aria-label="On this page">
          <p className="legal-toc-title">On this page</p>
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </aside>

        <article className="legal-content">
          <h1>{title}</h1>
          <p className="legal-updated">Last updated {LEGAL.lastUpdated}</p>
          <p className="legal-intro">{intro}</p>

          {sections.map((s) => (
            <section key={s.id} id={s.id}>
              <h2>{s.title}</h2>
              {s.body}
            </section>
          ))}
        </article>
      </main>

      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <span>© {new Date().getFullYear()} {LEGAL.appName}</span>
      <Link to="/privacy">Privacy</Link>
      <Link to="/terms">Terms</Link>
      <Link to="/cookies">Cookies</Link>
    </footer>
  );
}
