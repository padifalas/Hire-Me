import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUpWithEmail, signInWithEmail } from "../../services/authService";
import { supabase } from "../../config/supabase";


import "./SignUp.css";

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

  // 2 fetch role from users table i supabase using result.user.id 
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
    navigate("/employer-dashboard");
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
          <span className="logo-text">HireMe</span>
          <span className="logo-dot">.</span>
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
                  placeholder="Jane Doe"
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

            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
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
