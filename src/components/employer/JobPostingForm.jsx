import { useState } from "react";
import { createOpportunity, updateOpportunity } from "../../services/employerService";

import "./JobPostingForm.css";

import { X, Plus } from "lucide-react";

const JOB_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
];


const BEE_OPTIONS = [
  { value: "", label: "No preference stated" },
  { value: "preferred", label: "BEE candidates preferred" },
  { value: "required", label: "BEE compliance required for this role" },
];

function TagInput({ label, tags, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const trimmed = draft.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="jpf-field">
      <label>{label}</label>
      <div className="jpf-tag-input">
        {tags.map((tag) => (
          <span key={tag} className="jpf-tag">
            {tag}
            <button type="button" onClick={() => removeTag(tag)}>
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

export default function JobPostingForm({ employerId, existingJob, onClose, onSaved }) {
  const isEditing = Boolean(existingJob);

  const [form, setForm] = useState({
    title: existingJob?.title ?? "",
    description: existingJob?.description ?? "",
    requiredSkills: existingJob?.required_skills ?? [],
    niceToHaveSkills: existingJob?.nice_to_have_skills ?? [],
    location: existingJob?.location ?? "",
    jobType: existingJob?.job_type ?? "internship",
    salaryMin: existingJob?.salary_min ?? "",
    salaryMax: existingJob?.salary_max ?? "",
    deadline: existingJob?.deadline ? existingJob.deadline.split("T")[0] : "",
    remoteOption: existingJob?.remote_option ?? false,
    beePreference: existingJob?.bee_preference ?? "",
  });

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  function validate() {
    if (!form.title || !form.description || !form.location) {
      return "Please fill in the job title, description, and location.";
    }
    if (form.requiredSkills.length === 0) {
      return "Add at least one required skill so we can match candidates.";
    }
    if (form.salaryMin && form.salaryMax && Number(form.salaryMin) > Number(form.salaryMax)) {
      return "Minimum salary can't be higher than maximum salary.";
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

    const payload = {
      ...form,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
      deadline: form.deadline || null,
    };

    const result = isEditing
      ? await updateOpportunity(existingJob.id, payload)
      : await createOpportunity(employerId, payload);

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSaved(result.opportunity);
  }

  return (
    <div className="jpf-overlay" onClick={onClose}>
      <div className="jpf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="jpf-modal__header">
          <h2>{isEditing ? "Edit job posting" : "Post a new job"}</h2>
          <button className="jpf-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="jpf-form">
          <div className="jpf-field">
            <label>Job title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Junior Full-Stack Developer"
            />
          </div>

          <div className="jpf-field">
            <label>Description *</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the role, responsibilities, and what makes it a great opportunity..."
              rows={5}
            />
          </div>

          <TagInput
            label="Required skills *"
            tags={form.requiredSkills}
            onChange={(tags) => setForm({ ...form, requiredSkills: tags })}
            placeholder="Type a skill and press Enter (e.g. React)"
          />

          <TagInput
            label="Nice-to-have skills"
            tags={form.niceToHaveSkills}
            onChange={(tags) => setForm({ ...form, niceToHaveSkills: tags })}
            placeholder="Type a skill and press Enter"
          />

          <div className="jpf-grid">
            <div className="jpf-field">
              <label>Location *</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Johannesburg"
              />
            </div>
            <div className="jpf-field">
              <label>Job type</label>
              <select name="jobType" value={form.jobType} onChange={handleChange}>
                {JOB_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="jpf-field">
              <label>Min salary (ZAR/month)</label>
              <input
                type="number"
                name="salaryMin"
                value={form.salaryMin}
                onChange={handleChange}
                placeholder="e.g. 12000"
                min="0"
              />
            </div>
            <div className="jpf-field">
              <label>Max salary (ZAR/month)</label>
              <input
                type="number"
                name="salaryMax"
                value={form.salaryMax}
                onChange={handleChange}
                placeholder="e.g. 18000"
                min="0"
              />
            </div>
            <div className="jpf-field">
              <label>Application deadline</label>
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
              />
            </div>
            <div className="jpf-field">
              <label>BEE preference</label>
              <select name="beePreference" value={form.beePreference} onChange={handleChange}>
                {BEE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="jpf-checkbox-label">
            <input
              type="checkbox"
              name="remoteOption"
              checked={form.remoteOption}
              onChange={handleChange}
            />
            This role offers remote / hybrid work
          </label>

          {error && <p className="jpf-error">{error}</p>}

          <div className="jpf-actions">
            <button type="button" className="jpf-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="jpf-submit-btn" disabled={submitting}>
              <Plus size={15} />
              {submitting ? "Saving..." : isEditing ? "Save changes" : "Post job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
