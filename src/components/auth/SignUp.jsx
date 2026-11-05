import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUpWithEmail, signInWithEmail } from "../../services/authService";
import { supabase } from "../../config/supabase";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Check,
  GraduationCap,
  Building2,
  Sparkles,
  Target,
  FileText,
} from "lucide-react";
import HireMeLogo from "../../assets/HireMeLogo.png";

import "./SignUp.css";
import "../legal/Legal.css";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One number", test: (pw) => /[0-9]/.test(pw) },
  { label: "One special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

const ROLE_OPTIONS = [
  {
    value: "student",
    label: "Student / Graduate",
    hint: "Find roles that fit your skills",
    Icon: GraduationCap,
  },
  {
    value: "employer",
    label: "Employer",
    hint: "Post jobs and review ranked candidates",
    Icon: Building2,
  },
];

const BRAND_COPY = {
  signin: {
    title: "Welcome back!",
    text: "Please sign in to continue your journey.",
    prompt: "Don't have an account yet?",
    action: "Sign Up",
    target: "signup",
  },
  signup: {
    title: "Start your journey with HireMe",
    text: "Enter you details to start your journey with us.",
    prompt: "Already have an account?",
    action: "Sign In",
    target: "signin",
  },
};

const BRAND_POINTS = [
  {
    Icon: Sparkles,
    text: "AI turns your CV and coursework into skills employers recognise.",
  },
  {
    Icon: Target,
    text: "Match scores that show exactly why you fit a role.",
  },
  {
    Icon: FileText,
    text: "Apply in one click with a cover letter drafted for you.",
  },
];

function PasswordChecklist({ password }) {
  return (
    <ul className="password-checklist">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`password-checklist__item${met ? " password-checklist__item--met" : ""}`}
          >
            {met ? (
              <CheckCircle2 size={13} />
            ) : (
              <span className="password-checklist__dot" />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

// Custom listbox so it matches with theme

function RoleSelect({ id, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);

  const selectedIndex = Math.max(
    0,
    ROLE_OPTIONS.findIndex((o) => o.value === value),
  );
  const selected = ROLE_OPTIONS[selectedIndex];

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle() {
    setActiveIndex(selectedIndex);
    setOpen((o) => !o);
  }

  function choose(optionValue) {
    onChange(optionValue);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
        return;
      }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(
        (index) => (index + step + ROLE_OPTIONS.length) % ROLE_OPTIONS.length,
      );
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) choose(ROLE_OPTIONS[activeIndex].value);
      else toggle();
    }
  }

  const SelectedIcon = selected.Icon;

  return (
    <div className="auth-select" ref={wrapperRef}>
      <button
        type="button"
        id={id}
        className={`auth-select__trigger${open ? " auth-select__trigger--open" : ""}`}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => {
          if (e.key === " ") e.preventDefault();
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}`}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
      >
        <SelectedIcon
          size={16}
          className="auth-select__icon"
          aria-hidden="true"
        />
        <span className="auth-select__value">{selected.label}</span>
        <ChevronDown
          size={16}
          className="auth-select__chevron"
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          className="auth-select__menu"
          role="listbox"
          aria-labelledby={`${id}-label`}
        >
          {ROLE_OPTIONS.map((option, i) => {
            const isSelected = option.value === value;
            const OptionIcon = option.icon;
            return (
              <li
                key={option.value}
                id={`${id}--opt-${i}`}
                role="option"
                aria-selected={isSelected}
                className={`auth-select__option${i === activeIndex ? " auth-select__option--active" : ""}${isSelected ? " auth-select__option--selected" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option.value);
                }}
              >
                <span className="auth-select__option-icon">
                  <OptionIcon size={16} aria-hidden="true" />
                </span>
                <span className="auth-select__option-text">
                  <span className="auth-select__option-label">
                    {option.label}
                  </span>
                  <span className="auth-select__option-hint">
                    {option.hint}
                  </span>
                </span>
                {isSelected && (
                  <Check
                    size={15}
                    className="auth-select__check"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
export default function SignUp() {
  const [mode, setMode] = useState("signin");
  // Page won't animate on initial startup
  const [switched, setSwitched] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "student",
  });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const navigate = useNavigate();

  const isSignUp = mode === "signup";
  const copy = BRAND_COPY[mode];

  // Sign up comes from the bottom and sign in comes from top
  const direction = isSignUp ? "from-bottom" : "from-top";

  function switchMode(next) {
    if (next === mode) return;
    setSwitched(true);
    setMode(next);
    setError(null);
    setMessage(null);
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleRoleChange(role) {
    setFormData((prev) => ({ ...prev, role }));
  }

  async function handleSignUp() {
    // Backstop for the `required` checkbox in case the form is submitted another way.
    if (!acceptedTerms) {
      setError(
        "Please accept the Terms & Conditions and Privacy Policy to continue.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await signUpWithEmail(formData.email, formData.password, {
      fullName: formData.fullName,
      role: formData.role,
    });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!result.session) {
      // for when mail confirmation is required on this project - there is no
      // session yet to act on, so this is as far as we can take them
      // until they click the link in their inbox.
      setMessage("Account created! Check your email to confirm your account.");
      setLoading(false);
      return;
    }

    // sign in immediately (when email confirmation off). handle_new_user
    // has already created their profile row atomically as part of
    // sign-up, so skip the Sign In tab entirely and take them straight
    // into setup.
    setLoading(false);
    navigate(
      formData.role === "employer"
        ? "/employer-profile-setup"
        : "/profile-setup",
    );
  }

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await signInWithEmail(formData.email, formData.password);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // fetch role (and, for students, profile completion) from users/student_profiles
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", result.user.id)
      .single();

    if (error || !data) {
      navigate("/student-dashboard");
      return;
    }

    if (data.role === "employer") {
      const { data: employerProfile } = await supabase
        .from("employer_profiles")
        .select("profile_completed")
        .eq("id", result.user.id)
        .single();

      if (!employerProfile?.profile_completed) {
        navigate("/employer-profile-setup");
      } else {
        navigate("/employer-dashboard");
      }
      return;
    }

    // Student: check whether they still need to complete their profile
    const { data: studentProfile } = await supabase
      .from("student_profiles")
      .select("profile_completed")
      .eq("id", result.user.id)
      .single();

    if (!studentProfile?.profile_completed) {
      navigate("/profile-setup");
    } else {
      navigate("/student-dashboard");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (mode === "signup") {
      handleSignUp();
    } else {
      handleSignIn();
    }
  }

  const SwitchIcon = isSignUp ? ArrowLeft : ArrowRight;

  return (
    <div className="auth-page">
      <div className="auth-shell" data-mode={mode}>
        {/* Left: brand panel */}
        <aside className="auth-brand">
          {/* Two gradient layers. Whichever mode is active sits on top and
                wipes in from its own edge, so the change is obvious. */}
          <div
            className={`auth-brand__bg auth-brand__bg--signin${!isSignUp ? " is-active" : ""}${!isSignUp && switched ? " is-entering" : ""}`}
            aria-hidden="true"
          >
            <span className="auth-blob auth-blob--a" />
            <span className="auth-blob auth-blob--b" />
            <span className="auth-blob auth-blob--c" />
          </div>
          <div
            className={`auth-brand__bg auth-brand__bg--signup${isSignUp ? " is-active" : ""}${isSignUp && switched ? " is-entering" : ""}`}
            aria-hidden="true"
          >
            <span className="auth-blob auth-blob--a" />
            <span className="auth-blob auth-blob--b" />
            <span className="auth-blob auth-blob--c" />
          </div>

          <div className="auth-brand__logo">
            <img
              src={HireMeLogo}
              alt="HireMe logo"
              className="auth-brand__logo-img"
            />
          </div>

          <div
            key={mode}
            className={`auth-brand__content${switched ? ` auth-brand__content--${direction}` : ""}`}
          >
            <h2 className="auth-brand__title">{copy.title}</h2>
            <p className="auth-brand__text">{copy.text}</p>

            {isSignUp && (
              <ul className="auth-brand__points">
                {BRAND_POINTS.map(({ Icon, text }) => (
                  <li key={text}>
                    <span className="auth-brand__point-icon">
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="auth-brand__switch">
              <span className="auth-brand__prompt">{copy.prompt}</span>
              <button
                type="button"
                className="auth-ghost-btn"
                onClick={() => switchMode(copy.target)}
              >
                {copy.action}
                <SwitchIcon size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>

        {/* Right: form */}
        <section className="auth-form-side">
          <div
            key={mode}
            className={`auth-form-wrap${switched ? ` auth-form-wrap--${direction}` : ""}`}
          >
            <header className="auth-form-header">
              <h1 className="auth-form-title">
                {isSignUp ? "Create your account" : "Sign in"}
              </h1>
              <p className="auth-form-subtitle">
                {isSignUp
                  ? "It only takes a minute. You’ll set up your profile next."
                  : "Enter your email and password to continue."}
              </p>
            </header>

            <form onSubmit={handleSubmit} className="auth-form">
              {isSignUp && (
                <>
                  <div className="auth-field">
                    <label htmlFor="fullName">Full name</label>
                    <div className="auth-input">
                      <User
                        size={16}
                        className="auth-input__icon"
                        aria-hidden="true"
                      />
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        placeholder="André Gopal"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <span className="auth-field__label" id="role-label">
                      I am a...
                    </span>
                    <RoleSelect
                      id="role"
                      value={formData.role}
                      onChange={handleRoleChange}
                    />
                  </div>
                </>
              )}

              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <div className="auth-input">
                  <Mail
                    size={16}
                    className="auth-input__icon"
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="password">Password</label>
                <div className="auth-input">
                  <Lock
                    size={16}
                    className="auth-input__icon"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isSignUp ? "new-password" : "current-password"
                    }
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {isSignUp && <PasswordChecklist password={formData.password} />}
              </div>

              {isSignUp && (
                <label className="auth-consent" htmlFor="acceptedTerms">
                  <input
                    id="acceptedTerms"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I’m 18 or older and I agree to the{" "}
                    <Link to="/terms" target="_blank" rel="noopener noreferrer">
                      Terms &amp; Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </Link>
                    , including AI processing of my CV.
                  </span>
                </label>
              )}

              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}

              {message && (
                <p className="auth-message" role="status">
                  {message}
                </p>
              )}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading
                  ? "Please wait..."
                  : isSignUp
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>

            {/* Shown on small screens, where the brand panel's button is hidden */}
            <p className="auth-switch-inline">
              {copy.prompt}{" "}
              <button type="button" onClick={() => switchMode(copy.target)}>
                {copy.action}
              </button>
            </p>

            <nav className="auth-legal-links" aria-label="Legal">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/cookies">Cookies</Link>
            </nav>
          </div>
        </section>
      </div>
    </div>
  );
}
