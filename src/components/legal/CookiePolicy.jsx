import LegalLayout from "./LegalLayout";
import { LEGAL } from "../../config/legalConfig";

const sections = [
  {
    id: "what",
    title: "What this covers",
    body: (
      <p>
        Cookies are small files a website saves in your browser. {LEGAL.appName}{" "}
        also uses your browser’s local storage, which works in a similar way.
        This page lists everything we store so you can see exactly what it does.
      </p>
    ),
  },
  {
    id: "what-we-store",
    title: "What we store",
    body: (
      <div className="legal-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Type</th>
              <th>Lasts</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>sb-…-auth-token</code></td>
              <td>Keeps you signed in. Set by our authentication provider, Supabase.</td>
              <td>Essential (local storage)</td>
              <td>Until you sign out or the session expires</td>
            </tr>
            <tr>
              <td><code>hireme_cookie_notice</code></td>
              <td>Remembers that you’ve seen this notice.</td>
              <td>Essential (local storage)</td>
              <td>12 months</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "third-party",
    title: "Third-party requests",
    body: (
      <p>
        Our pages load fonts from Google Fonts. Google receives your IP address
        and browser details when that happens, but we don’t set any Google
        cookies. We don’t use advertising or analytics cookies.
      </p>
    ),
  },
  {
    id: "essential",
    title: "Why there’s no opt-out for these",
    body: (
      <p>
        The items above are strictly necessary: without the sign-in token you
        couldn’t stay logged in. If we ever add analytics or marketing
        cookies, we’ll ask for your permission first and update this page.
      </p>
    ),
  },
  {
    id: "manage",
    title: "Managing storage",
    body: (
      <p>
        You can clear cookies and site data in your browser settings at any
        time. If you clear them, you’ll be signed out and will see the cookie
        notice again.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Questions",
    body: (
      <p>

        More on how we handle your data is in the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    ),
  },
];

export default function CookiePolicy() {
  return (
    <LegalLayout
      title="Cookie Policy"
      intro="HireMe only stores what it needs to keep you signed in. Here’s the full list."
      sections={sections}
    />
  );
}
