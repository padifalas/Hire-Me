import { useState, useEffect } from "react";
import { getEmployerProfile, updateEmployerProfile, uploadCompanyLogo } from "../../services/employerService";

import "./CompanyProfileView.css";

import { ImageIcon, CheckCircle2 } from "lucide-react";

const INDUSTRIES = [
  "Software / IT", "Finance / Banking", "Retail / E-commerce", "Telecommunications",
  "Manufacturing", "Consulting", "Healthcare", "Education", "Media / Marketing", "Other",
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export default function CompanyProfileView({ user }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const result = await getEmployerProfile(user.id);
      if (result.success) {
        setProfile(result.profile);
        setForm({
          companyName: result.profile.company_name ?? "",
          industry: result.profile.industry ?? "",
          companySize: result.profile.company_size ?? "",
          location: result.profile.location ?? "",
          website: result.profile.website ?? "",
          description: result.profile.description ?? "",
          beeCommitted: result.profile.bee_committed ?? false,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  function handleLogoSelect(file) {
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      if (logoFile) {
        const logoResult = await uploadCompanyLogo(logoFile, user.id);
        if (!logoResult.success) throw new Error(logoResult.error);
      }

      const result = await updateEmployerProfile(user.id, form);
      if (!result.success) throw new Error(result.error);

      const refreshed = await getEmployerProfile(user.id);
      if (refreshed.success) setProfile(refreshed.profile);

      setLogoFile(null);
      setSaveMessage("Company profile saved.");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="cpv-loading">Loading company profile...</div>;
  if (!profile || !form) return <div className="cpv-loading">Couldn't load company profile.</div>;

  const displayedLogo = logoPreview || profile.logo_url;

  return (
    <div className="cpv-root">
      <div className="cpv-header">
        <h1 className="cpv-title">Company Profile</h1>
        <p className="cpv-subtitle">This is what students see on your job postings.</p>
      </div>

      <form onSubmit={handleSubmit} className="cpv-card">
        <div className="cpv-logo-row">
          <label className="cpv-logo-dropzone">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => handleLogoSelect(e.target.files?.[0] ?? null)}
              hidden
            />
            {displayedLogo ? (
              <img src={displayedLogo} alt="Company logo" />
            ) : (
              <ImageIcon size={20} />
            )}
          </label>
          <div>
            <div className="cpv-logo-label">Company logo</div>
            <div className="cpv-logo-hint">Click the square to upload or replace (max 2MB)</div>
          </div>
        </div>

        <div className="cpv-fields-grid">
          <div className="cpv-field">
            <label>Company name</label>
            <input name="companyName" value={form.companyName} onChange={handleChange} />
          </div>
          <div className="cpv-field">
            <label>Industry</label>
            <select name="industry" value={form.industry} onChange={handleChange}>
              <option value="" disabled>Select an industry</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div className="cpv-field">
            <label>Company size</label>
            <select name="companySize" value={form.companySize} onChange={handleChange}>
              <option value="" disabled>Select company size</option>
              {COMPANY_SIZES.map((s) => (
                <option key={s} value={s}>{s} employees</option>
              ))}
            </select>
          </div>
          <div className="cpv-field">
            <label>Location (city)</label>
            <input name="location" value={form.location} onChange={handleChange} />
          </div>
          <div className="cpv-field">
            <label>Website</label>
            <input name="website" value={form.website} onChange={handleChange} />
          </div>
        </div>

        <div className="cpv-field">
          <label>Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
          />
        </div>

        <label className="cpv-checkbox-label">
          <input
            type="checkbox"
            name="beeCommitted"
            checked={form.beeCommitted}
            onChange={handleChange}
          />
          This company is committed to BEE / transformation hiring goals
        </label>

        {saveMessage && (
          <p className="cpv-save-message">
            <CheckCircle2 size={14} /> {saveMessage}
          </p>
        )}
        {error && <p className="cpv-error">{error}</p>}

        <button type="submit" className="cpv-save-btn" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
