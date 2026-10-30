import { useState } from "react";
import { Link } from "react-router-dom";
import "./Legal.css";

const KEY = "hireme_cookie_notice";

function alreadySeen() {
  try {
    return localStorage.getItem(KEY) === "seen";
  } catch {
    return false;
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => !alreadySeen());

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "seen");
    } catch {
      /* storage blocked: banner just shows again next visit */
    }
    setVisible(false);
  };

  return (
    <div className="cookie-banner" role="region" aria-label="Cookie notice">
      <p>
        HireMe only stores what it needs to keep you signed in. No tracking or
        advertising.{" "}
        <Link to="/cookies">See what we store</Link>
      </p>
      <button type="button" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}
