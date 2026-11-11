import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import {
  updateEmployerProfile,
  uploadCompanyLogo,
} from "../../services/employerService";

import "../student/ProfileSetup.css"; // shares the auth-style page/card layout with the student

import { UploadCloud, ImageIcon } from "lucide-react";

const INDUSTRIES = [
  "Software / IT",
  "Finance / Banking",
  "Retail / E-commerce",
  "Telecommunications",
  "Manufacturing",
  "Consulting",
  "Healthcare",
  "Education",
  "Media / Marketing",
  "Other",
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

function Field({ id, label, required, children }) {
  return (
    <div className="ps-field">
      <label htmlFor={id}>
        {label}{" "}
        {required && (
          <span className="ps-required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

export default function EmployerProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // authh guard now lives in <ProtectedRoute> (src/components/auth/
  // ProtectedRoute.jsx) - this component only ever mounts once that has
  // already confirmed a signed-in employer.

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

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  function handleLogoSelect(file) {
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
  }

  function validate() {
    if (
      !form.companyName ||
      !form.industry ||
      !form.companySize ||
      !form.location
    ) {
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

  return (
    <div className="ps-page">
      <div className="ps-card">
        <div className="ps-header">
          <span className="ps-logo">
            HireMe<span className="ps-logo-dot">.</span>
          </span>
          <h1 className="ps-title">Set up your company profile</h1>
          <p className="ps-subtitle">
            This is what students see when they view your job postings - worth
            making it count.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="ps-form">
          <div className="ps-section">
            <h2 className="ps-section__title">Company details</h2>

            <div className="ps-grid">
              <Field id="eps-company" label="Company name" required>
                <input
                  id="eps-company"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="Takealot"
                  autoComplete="organization"
                  required
                />
              </Field>

              <Field id="eps-industry" label="Industry" required>
                <select
                  id="eps-industry"
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>
                    Select an industry
                  </option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="eps-size" label="Company size" required>
                <select
                  id="eps-size"
                  name="companySize"
                  value={form.companySize}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>
                    Select company size
                  </option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s} employees
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="eps-location" label="Location (city)" required>
                <input
                  id="eps-location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Cape Town"
                  autoComplete="off"
                  required
                />
              </Field>

              <Field id="eps-website" label="Website">
                <input
                  id="eps-website"
                  name="website"
                  inputMode="url"
                  autoComplete="url"
                  value={form.website}
                  onChange={handleChange}
                  placeholder="https://company.com"
                />
              </Field>
            </div>
          </div>

          <div className="ps-section">
            <h2 className="ps-section__title">About your company</h2>

            <Field id="eps-description" label="Description">
              <textarea
                id="eps-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="What does your company do? What's it like to work there?"
                rows={4}
                className="ps-textarea"
              />
            </Field>
          </div>

          <div className="ps-section">
            <h2 className="ps-section__title">Logo</h2>

            <label className="ps-dropzone ps-dropzone--logo">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={(e) => handleLogoSelect(e.target.files?.[0] ?? null)}
              />

              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="" className="ps-logo-preview" />
                  <span className="sr-only">
                    Logo selected. Activate to choose a different logo.
                  </span>
                </>
              ) : (
                <>
                  <ImageIcon size={18} aria-hidden="true" />
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
