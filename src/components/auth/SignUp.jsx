import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUpWithEmail, signInWithEmail } from "../../services/authService";
import { supabase } from "../../config/supabase";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import HireMeLogo from "../../assets/HireMeLogo.png";

import "./SignUp.css";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One number", test: (pw) => /[0-9]/.test(pw) },
  { label: "One special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
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

export default function SignUp() {
  const [mode, setMode] = useState("signin");
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

  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSignUp() {
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

    setMessage("Account created! Check your email to confirm your account.");
    setLoading(false);
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={HireMeLogo} alt="HireMe logo" className="auth-logo__img" />
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === "signin" ? "active" : ""}`}
            onClick={() => {
              setMode("signin");
              setError(null);
              setMessage(null);
            }}
          >
            Sign In
          </button>

          <button
            type="button"
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError(null);
              setMessage(null);
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="André Gopal"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">I am a...</label>

                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="student">Student / Graduate</option>

                  <option value="employer">Employer</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="password-input-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
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
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {mode === "signup" && (
              <PasswordChecklist password={formData.password} />
            )}
          </div>

          {error && <p className="auth-error">{error}</p>}

          {message && <p className="auth-message">{message}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "signup"
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
