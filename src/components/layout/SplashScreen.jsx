import { useEffect, useState } from "react";
import HireMeLogo from "../../assets/HireMeLogo.png";
import "./SplashScreen.css";

//  splash stays up for at least this long so the animation can play,
// even if the auth check finishes sooner.
const MIN_VISIBLE_MS = 1800;
const EXIT_MS = 500;

export default function SplashScreen({ ready, onDone }) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);


  useEffect(() => {
    if (!ready || !minElapsed) return;
    setLeaving(true);
    const t = setTimeout(onDone, EXIT_MS);
    return () => clearTimeout(t);
  }, [ready, minElapsed, onDone]);

  return (
    <div
      className={`splash${leaving ? " splash--leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading HireMe"
    >
      <span className="splash__blob splash__blob--accent" aria-hidden="true" />
      <span className="splash__blob splash__blob--slate" aria-hidden="true" />

      <div className="splash__content">
        <div className="splash__logo-wrap">
          <span className="splash__glow" aria-hidden="true" />
          <img src={HireMeLogo} alt="HireMe" className="splash__logo" />
        </div>

        <div className="splash__bar" aria-hidden="true">
          <span className="splash__bar-fill" />
        </div>

        <p className="splash__caption" aria-hidden="true">
          Finding your match
          <span className="splash__dots">
            <i />
            <i />
            <i />
          </span>
        </p>
      </div>
    </div>
  );
}
