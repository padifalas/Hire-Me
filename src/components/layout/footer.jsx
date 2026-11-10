import "./Footer.css";
import HireMeLogo from "../../assets/HireMeLogo.png";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src={HireMeLogo} alt="HireMe" className="footer-logo" />

        <span className="footer-tagline">
          AI-POWERED CAREEER MATCHING
        </span>
      </div>

      <nav className="footer-links">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/cookies">Cookies</a>
        <span className="footer-year">© 2026</span>
      </nav>
    </footer>
  );
}

export default Footer;
