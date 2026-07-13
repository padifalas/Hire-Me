import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { updateEmployerProfile, uploadCompanyLogo } from "../../services/employerService";

import "../student/ProfileSetup.css"; // shares the auth-style page/card layout with the student

import { UploadCloud, ImageIcon } from "lucide-react";

const INDUSTRIES = [
  "Software / IT", "Finance / Banking", "Retail / E-commerce", "Telecommunications",
  "Manufacturing", "Consulting", "Healthcare", "Education", "Media / Marketing", "Other",
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export default function EmployerProfileSetup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    location: "",
    website: "",
    description: "",
    beeCommitted: false,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  function handleLogoSelect(file) {
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
  }

  function validate() {
    if (!form.companyName || !form.industry || !form.companySize || !form.location) {
      return "Please fill in company name, industry, company size, and location.";
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      if (logoFile) {
        const logoResult = await uploadCompanyLogo(logoFile, user.id);
        if (!logoResult.success) throw new Error(logoResult.error);
      }

      const result = await updateEmployerProfile(user.id, form);
      if (!result.success) throw new Error(result.error);

      navigate("/employer-dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="ps-page">
      <div className="ps-card">
        <div className="ps-header">
          <span className="ps-logo">
            HireMe<span className="ps-logo-dot">.</span>
          </span>
          <h1 className="ps-title">Set up your company profile</h1>
          <p className="ps-subtitle">
            This is what students see when they view your job postings -
            worth making it count.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="ps-form">
          <div className="ps-section">
            <h2 className="ps-section__title">Company details</h2>
            <div className="ps-grid">
              <div className="ps-field">
                <label>Company name *</label>
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="Takealot"
                  required
                />
              </div>
              <div className="ps-field">
                <label>Industry *</label>
                <select name="industry" value={form.industry} onChange={handleChange} required>
                  <option value="" disabled>Select an industry</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div className="ps-field">
                <label>Company size *</label>
                <select name="companySize" value={form.companySize} onChange={handleChange} required>
                  <option value="" disabled>Select company size</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s} value={s}>{s} employees</option>
                  ))}
                </select>
              </div>
              <div className="ps-field">
                <label>Location (city) *</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Cape Town"
                  required
                />
              </div>
              <div className="ps-field">
                <label>Website</label>
                <input
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  placeholder="https://company.com"
                />
              </div>
            </div>
          </div>

          <div className="ps-section">
            <h2 className="ps-section__title">About your company</h2>
            <div className="ps-field">
              <label>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="What does your company do? What's it like to work there?"
                rows={4}
                className="ps-textarea"
              />
            </div>
          </div>

          <div className="ps-section">
            <h2 className="ps-section__title">Logo</h2>
            <label className="ps-dropzone ps-dropzone--logo">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => handleLogoSelect(e.target.files?.[0] ?? null)}
                hidden
              />
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="ps-logo-preview" />
              ) : (
                <>
                  <ImageIcon size={18} />
                  <span>Click to upload a logo (PNG, JPG, SVG, max 2MB)</span>
                </>
              )}
            </label>
          </div>

          <div className="ps-checkbox-row">
            <label className="ps-checkbox-label">
              <input
                type="checkbox"
                name="beeCommitted"
                checked={form.beeCommitted}
                onChange={handleChange}
              />
              This company is committed to BEE / transformation hiring goals
            </label>
          </div>

          {error && <p className="ps-error">{error}</p>}

          <button type="submit" className="ps-submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save & continue to dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
