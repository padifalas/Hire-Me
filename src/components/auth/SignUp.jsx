import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSignUp() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: formData.fullName,
        role: formData.role,
        email: formData.email,
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }

    setMessage("Account created! Check your email to confirm your account.");

    setLoading(false);
  }

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    navigate("/dashboard");
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
