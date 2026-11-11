import { useState } from "react";
import {
  createOpportunity,
  updateOpportunity,
} from "../../services/employerService";
import useDialog from "../../hooks/useDialog";

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

function TagInput({
  id,
  label,
  required,
  tags,
  onChange,
  placeholder,
  variant = "required",
  invalid,
  errorId,
}) {
  const [draft, setDraft] = useState("");
  const [announce, setAnnounce] = useState("");
  const hintId = `${id}-hint`;

  function addTag() {
    const trimmed = draft.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setAnnounce(`Added ${trimmed}. ${tags.length + 1} total.`);
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
    setAnnounce(`Removed ${tag}. ${tags.length - 1} remaining.`);
    document.getElementById(id)?.focus();
  }

  return (
    <div className="jpf-field">
      <label htmlFor={id}>{label}</label>
      <div className="jpf-tag-input">
        {tags.map((tag) => (
          <span key={tag} className={`jpf-tag jpf-tag--${variant}`}>
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
            >
              <X size={11} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={placeholder}
          aria-describedby={`${hintId}${invalid ? ` ${errorId}` : ""}`}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
        />
      </div>
      <span className="jpf-hint" id={hintId}>
        Press Enter or comma after each skill. {tags.length} added.
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}

export default function JobPostingForm({
  employerId,
  existingJob,
  onClose,
  onSaved,
}) {
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

  const [error, setError] = useState(null); // { field, message }
  const [submitting, setSubmitting] = useState(false);

  const dialogRef = useDialog({ onClose, closeDisabled: submitting });

  const invalid = (fieldId) => (error?.field === fieldId ? true : undefined);
  const describedBy = (fieldId) =>
    error?.field === fieldId ? "jpf-error" : undefined;

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  function validate() {
    if (!form.title)
      return { field: "jpf-title", message: "Please enter a job title." };
    if (!form.description)
      return {
        field: "jpf-description",
        message: "Please enter a job description.",
      };
    if (!form.location)
      return { field: "jpf-location", message: "Please enter a location." };
    if (form.requiredSkills.length === 0) {
      return {
        field: "jpf-required-skills",
        message: "Add at least one required skill so we can match candidates.",
      };
    }
    if (
      form.salaryMin &&
      form.salaryMax &&
      Number(form.salaryMin) > Number(form.salaryMax)
    ) {
      return {
        field: "jpf-salary-max",
        message: "Minimum salary can't be higher than maximum salary.",
      };
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      document.getElementById(problem.field)?.focus();
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
      setError({ field: null, message: result.error });
      return;
    }
    onSaved(result.opportunity);
  }

  return (
    <div
      className="jpf-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="jpf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jpf-heading"
        tabIndex={-1}
      >
        <div className="jpf-modal__header">
          <h2 id="jpf-heading">
            {isEditing ? "Edit job posting" : "Post a new job"}
          </h2>
          <button
            type="button"
            className="jpf-close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close job form"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="jpf-form" noValidate>
          <p className="jpf-required-note">Fields marked * are required.</p>

          <div className="jpf-field">
            <label htmlFor="jpf-title">Job title *</label>
            <input
              id="jpf-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Junior Full-Stack Developer"
              autoComplete="off"
              aria-required="true"
              aria-invalid={invalid("jpf-title")}
              aria-describedby={describedBy("jpf-title")}
            />
          </div>

          <div className="jpf-field">
            <label htmlFor="jpf-description">Description *</label>
            <textarea
              id="jpf-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              placeholder="Describe the role, responsibilities, and what makes it a great opportunity..."
              aria-required="true"
              aria-invalid={invalid("jpf-description")}
              aria-describedby={describedBy("jpf-description")}
            />
          </div>

          <TagInput
            id="jpf-required-skills"
            label="Required skills *"
            required
            tags={form.requiredSkills}
            onChange={(tags) => setForm({ ...form, requiredSkills: tags })}
            placeholder="e.g. React"
            variant="required"
            invalid={invalid("jpf-required-skills")}
            errorId="jpf-error"
          />

          <TagInput
            id="jpf-nice-skills"
            label="Nice-to-have skills"
            tags={form.niceToHaveSkills}
            onChange={(tags) => setForm({ ...form, niceToHaveSkills: tags })}
            placeholder="e.g. TypeScript"
            variant="nice"
          />

          <div className="jpf-grid">
            <div className="jpf-field">
              <label htmlFor="jpf-location">Location *</label>
              <input
                id="jpf-location"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Johannesburg"
                autoComplete="off"
                aria-required="true"
                aria-invalid={invalid("jpf-location")}
                aria-describedby={describedBy("jpf-location")}
              />
            </div>
            <div className="jpf-field">
              <label htmlFor="jpf-job-type">Job type</label>
              <select
                id="jpf-job-type"
                name="jobType"
                value={form.jobType}
                onChange={handleChange}
              >
                {JOB_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="jpf-field">
              <label htmlFor="jpf-salary-min">Min salary (ZAR/month)</label>
              <input
                id="jpf-salary-min"
                type="number"
                inputMode="numeric"
                name="salaryMin"
                value={form.salaryMin}
                onChange={handleChange}
                placeholder="e.g. 12000"
                min="0"
              />
            </div>
            <div className="jpf-field">
              <label htmlFor="jpf-salary-max">Max salary (ZAR/month)</label>
              <input
                id="jpf-salary-max"
                type="number"
                inputMode="numeric"
                name="salaryMax"
                value={form.salaryMax}
                onChange={handleChange}
                placeholder="e.g. 18000"
                min="0"
                aria-invalid={invalid("jpf-salary-max")}
                aria-describedby={describedBy("jpf-salary-max")}
              />
            </div>
            <div className="jpf-field">
              <label htmlFor="jpf-deadline">Application deadline</label>
              <input
                id="jpf-deadline"
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
              />
            </div>
            <div className="jpf-field">
              <label htmlFor="jpf-bee">BEE preference</label>
              <select
                id="jpf-bee"
                name="beePreference"
                value={form.beePreference}
                onChange={handleChange}
              >
                {BEE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
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

          {error && (
            <p className="jpf-error" id="jpf-error" role="alert">
              {error.message}
            </p>
          )}

          <div className="jpf-actions">
            <button
              type="button"
              className="jpf-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="jpf-submit-btn"
              disabled={submitting}
            >
              <Plus size={15} aria-hidden="true" />
              {submitting
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Post job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
