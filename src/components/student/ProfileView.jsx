import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/authContext";
import { uploadAvatar, updateUserProfile } from "../../services/authService";
import {
  getStudentProfile,
  updateStudentProfile,
  uploadDocument,
  extractTextFromStoredDocument,
  triggerSkillExtraction,
} from "../../services/documentService";

import AutocompleteField from "../shared/AutocompleteField.jsx";
import "./ProfileView.css";
import { SA_UNIVERSITIES, SA_CITIES } from "../../utils/suggestionList";

import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  User as UserIcon,
  HdIcon,
} from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 2 + i);

const STEPS = [
  { key: "reading", label: "Reading CV & transcript" },
  { key: "extracting", label: "Extracting skills with AI" },
  { key: "done", label: "Done" },
];

const BEE_CATEGORIES = [
  { value: "black_african", label: "Black / African" },
  { value: "coloured", label: "Coloured" },
  { value: "indian", label: "Indian" },
  { value: "white", label: "White" },
  { value: "other", label: "Other" },
];

function FileDropField({ id, label, currentFileName, file, onSelect }) {
  const hasFile = Boolean(file || currentFileName);

  return (
    <div className="pv-file-field">
      <span className="pv-filefield__label" id={`${id}-label`}>
        {label}
      </span>
      <label className={`pv-dropzone${hasFile ? " pv-dropzone--filled" : ""}`}>
        <input
          id={id}
          type="file"
          accept=".pdf,.docx"
          className="sr-only"
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-name`}
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
        />
        <FileText size={16} aria-hidden="true" />

        <span className="pv-dropzone__filename" id={`${id}-name`}>
          {file ? file.name : currentFileName || "No file uploaded yet"}
        </span>

        <span className="pv-dropzone__action">
          <UploadCloud size={14} aria-hidden="true" />{" "}
          {currentFileName || file ? "Replace" : "Upload"}
        </span>
      </label>
    </div>
  );
}

function SkillChip({ label, type }) {
  return (
    <span className={`pv-skill-chip${type ? ` pv-skill-chip--${type}` : ""}`}>
      {label}
    </span>
  );
}

// Same checks as the dashboard, put it on this page as well so students can act on the changes.
function buildChecklist(profile) {
  return [
    {
      label: "University & qualification",
      done: Boolean(profile.university && profile.degree_program),
    },
    {
      label: "Location & phone number",
      done: Boolean(profile.location && profile.phone),
    },
    { label: "CV uploaded", done: Boolean(profile.cv_url) },
    {
      label: "Academic transcript uploaded",
      done: Boolean(profile.transcript_url),
    },
    {
      label: "LinkedIn, GitHub, or portfolio link",
      done: Boolean(
        profile.linkedin_url || profile.github_url || profile.portfolio_url,
      ),
    },
    {
      label: "AI analysis run on your documents",
      done: profile.ai_processing_status === "completed",
    },
  ];
}

function ChecklistCard({ profile }) {
  const items = buildChecklist(profile);
  const remaining = items.filter((i) => !i.done);

  if (remaining.length === 0) return null;

  return (
    <div className="pv-checklist-card">
      <p className="pv-checklist-card__title">Strengthen your profile</p>
      <p className="pv-checklist-card__hint">
        Employers see completed profiles first - here's what's left:
      </p>

      <ul className="pv-checklist">
        {items.map((item) => (
          <li
            key={item.label}
            className={`pv-checklist__item${item.done ? " pv-checklist__item--done" : ""}`}
          >
            {item.done ? (
              <CheckCircle2 size={14} aria-hidden="true" />
            ) : (
              <span className="pv-checklist__dot" aria-hidden="true" />
            )}

            {item.label}

            <span className="sr-only">
              {item.done ? " (done)" : " (to do)"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BeeDisclosureCard({ raceCategory, consentedAt, onSave, saving }) {
  const [editing, setEditing] = useState(!consentedAt);
  const [selected, setSelected] = useState(raceCategory ?? "");

  const hasAnswered = Boolean(consentedAt);
  const answeredLabel =
    raceCategory === "prefer_not_to_say"
      ? "You've opted out"
      : (BEE_CATEGORIES.find((c) => c.value === raceCategory)?.label ??
        "Shared");

  if (!editing && hasAnswered) {
    return (
      <div className="pv-bee-card pv-bee-card--collapsed">
        <div>
          <p className="pv-bee-card__status" role="status">
            <CheckCircle2 size={14} aria-hidden="true" /> {answeredLabel} for
            B-BBEE reporting
          </p>
          <p className="pv-bee-card__hint">
            Only shown to employers as anonymised totals, never as
            per-applicant.
          </p>
        </div>
        <button
          type="button"
          className="pv-bee-card__change-btn"
          onClick={() => setEditing(true)}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="pv-bee-card">
      <p className="pv-bee-card__title">
        Help employers report on B-BBEE compliance
      </p>
      <p className="pv-bee-card__hint">
        Optional. If you share this, employers only ever see anonymized totals
        across all applicants to a job - never your individual answer.
      </p>

      <div
        className="pv-bee-card__row"
        role="group"
        aria-label="B-BBEE category"
      >
        <label htmlFor="pv-bee-select" className="sr-only">
          B-BBEE category
        </label>

        <select
          id="pv-bee-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="pv-bee-card__select"
        >
          <option value="" disabled>
            Select your category
          </option>
          {BEE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="pv-bee-card__save-btn"
          disabled={!selected || saving}
          onClick={() => {
            onSave(selected);
            setEditing(false);
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          className="pv-bee-card__decline-btn"
          disabled={saving}
          onClick={() => {
            onSave("prefer_not_to_say");
            setEditing(false);
          }}
        >
          Prefer not to say
        </button>
      </div>
    </div>
  );
}

function AvatarCard({ avatarUrl, fullName, onSelect, preview, saving }) {
  const displayed = preview || avatarUrl;

  return (
    <div className="pv-avatar-card">
      <label className="pv-avatar-dropzone">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
        />
        {displayed ? (
          <img src={displayed} alt="" />
        ) : (
          <UserIcon size={22} aria-hidden="true" />
        )}

        <span className="sr-only">Change profile photo</span>
      </label>

      <div>
        <p className="pv-avatar-card__name">{fullName || "Your name"}</p>
        <p className="pv-avatar-card__hint" role="status">
          {saving
            ? "Uploading..."
            : "Click the circle to upload a photo (max 2MB)"}
        </p>
      </div>
    </div>
  );
}

function Field({ id, label, children }) {
  return (
    <div className="pv-field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

export default function ProfileView({ user }) {
  const { userProfile, refreshUserProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [newCvFile, setNewCvFile] = useState(null);
  const [newTranscriptFile, setNewTranscriptFile] = useState(null);

  const [savingFields, setSavingFields] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const [aiRunning, setAiRunning] = useState(false);
  const [aiStep, setAiStep] = useState(null);
  const [aiError, setAiError] = useState(null);

  const [expandedProjects, setExpandedProjects] = useState(new Set());

  const [savingBee, setSavingBee] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  async function handleSaveBeeCategory(category) {
    setSavingBee(true);
    const result = await updateStudentProfile(user.id, {
      raceCategory: category,
      beeDisclosureConsentedAt: new Date().toISOString(),
    });
    setSavingBee(false);
    if (result.success) {
      setProfile((prev) => ({
        ...prev,
        race_category: category,
        bee_disclosure_consented_at: new Date().toISOString(),
      }));
    } else {
      setSaveMessage(
        result.error || "Failed to save B-BBEE category. Please try again.",
      );
    }
  }

  function toggleProject(i) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const result = await getStudentProfile(user.id);
      if (result.success) {
        setProfile(result.profile);
        setForm({
          university: result.profile.university ?? "",
          qualification: result.profile.degree_program ?? "",
          graduationYear: result.profile.graduation_year ?? CURRENT_YEAR,
          location: result.profile.location ?? "",
          phone: result.profile.phone ?? "",
          linkedinUrl: result.profile.linkedin_url ?? "",
          githubUrl: result.profile.github_url ?? "",
          portfolioUrl: result.profile.portfolio_url ?? "",
        });
      }
      setLoadingProfile(false);
    })();
  }, [user]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSaveFields(e) {
    e.preventDefault();
    setSavingFields(true);
    setSaveMessage(null);

    const result = await updateStudentProfile(user.id, form);
    setSavingFields(false);
    setSaveMessage(result.success ? "Profile saved." : result.error);
  }

  async function handleRunAI() {
    setAiRunning(true);
    setAiError(null);
    setAiStep("reading");

    try {
      // Upload replacement files first, if any were chosen
      let cvPath = profile?.cv_url ?? null;
      let transcriptPath = profile?.transcript_url ?? null;
      let cvText = "";
      let transcriptText = "";

      if (newCvFile) {
        const res = await uploadDocument(newCvFile, user.id, "cv");
        if (!res.success) throw new Error(res.error);
        cvPath = res.path;
        cvText = res.extractedText;
      } else if (cvPath) {
        const res = await extractTextFromStoredDocument("cv", cvPath);
        if (!res.success) throw new Error(res.error);
        cvText = res.text;
      }

      if (newTranscriptFile) {
        const res = await uploadDocument(
          newTranscriptFile,
          user.id,
          "transcript",
        );

        if (!res.success) throw new Error(res.error);
        transcriptPath = res.path;
        transcriptText = res.extractedText;
      } else if (transcriptPath) {
        const res = await extractTextFromStoredDocument(
          "transcript",
          transcriptPath,
        );

        if (!res.success) throw new Error(res.error);
        transcriptText = res.text;
      }

      if (!cvText && !transcriptText) {
        throw new Error(
          "Upload a CV or transcript before running AI analysis.",
        );
      }

      setAiStep("extracting");
      const aiResult = await triggerSkillExtraction(
        user.id,
        cvText,
        transcriptText,
      );

      if (!aiResult.success) throw new Error(aiResult.error);

      setAiStep("done");

      // fresh the profile so the results section reflects the new dataa
      const refreshed = await getStudentProfile(user.id);
      if (refreshed.success) setProfile(refreshed.profile);

      setNewCvFile(null);
      setNewTranscriptFile(null);
      setTimeout(() => setAiRunning(false), 700);
    } catch (err) {
      setAiError(err.message || "AI analysis failed. Please try again.");
      setAiRunning(false);
      setAiStep(null);
    }
  }

  if (loadingProfile) {
    return (
      <div className="pv-loading" role="status">
        Loading your profile...
      </div>
    );
  }

  if (!profile || !form) {
    return (
      <div className="pv-loading" role="status">
        Couldn't load your profile. Try refreshing.
      </div>
    );
  }

  async function handleAvatarSelect(file) {
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));

    setSavingAvatar(true);
    const result = await uploadAvatar(file, user.id);
    setSavingAvatar(false);

    if (result.success) {
      await refreshUserProfile(); // updates sidebar immediately
    } else {
      setSaveMessage(result.error || "Failed to upload photo.");
    }
  }

  const hasResults = profile.ai_processing_status === "completed";
  const hasFailed = profile.ai_processing_status === "failed";

  return (
    <div className="pv-root">
      <div className="pv-header">
        <h1 className="pv-title">My Profile</h1>
        <p className="pv-subtitle">
          Update your details and re-run AI analysis any time.
        </p>
      </div>

      <ChecklistCard profile={profile} />

      <AvatarCard
        avatarUrl={userProfile?.avatar_url}
        fullName={userProfile?.full_name || profile.full_name}
        onSelect={handleAvatarSelect}
        preview={avatarPreview}
        saving={savingAvatar}
      />

      <BeeDisclosureCard
        raceCategory={profile.race_category}
        consentedAt={profile.bee_disclosure_consented_at}
        onSave={handleSaveBeeCategory}
        saving={savingBee}
      />

      <div className="pv-grid-layout">
        {/* tried editing these fields */}
        <form
          onSubmit={handleSaveFields}
          className="pv-card"
          aria-labelledby="pv-details-title"
        >
          <h2 className="pv-card__title" id="pv-details-title">
            Academic & contact details
          </h2>

          <div className="pv-fields-grid">
            <Field id="pv-university" label="University">
              <AutocompleteField
                id="pv-university"
                classPrefix="pv"
                name="university"
                value={form.university}
                onChange={handleChange}
                options={SA_UNIVERSITIES}
                placeholder="Start typing your university..."
              />
            </Field>

            <Field id="pv-qualification" label="Qualification">
              <input
                id="pv-qualification"
                name="qualification"
                value={form.qualification}
                onChange={handleChange}
                autoComplete="off"
              />
            </Field>

            <Field id="pv-gradyear" label="Graduation year">
              <select
                id="pv-gradyear"
                name="graduationYear"
                value={form.graduationYear}
                onChange={handleChange}
              >
                {GRAD_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="pv-location" label="Location (city)">
              <AutocompleteField
                id="pv-location"
                classPrefix="pv"
                name="location"
                value={form.location}
                onChange={handleChange}
                options={SA_CITIES}
                placeholder="Start typing your city..."
              />
            </Field>

            <Field id="pv-phone" label="Phone number">
              <input
                id="pv-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
              />
            </Field>

            <Field id="pv-linkedin" label="LinkedIn URL">
              <input
                id="pv-linkedin"
                name="linkedinUrl"
                inputMode="url"
                autoComplete="off"
                value={form.linkedinUrl}
                onChange={handleChange}
              />
            </Field>

            <Field id="pv-github" label="GitHub URL">
              <input
                id="pv-github"
                name="githubUrl"
                inputMode="url"
                autoComplete="off"
                value={form.githubUrl}
                onChange={handleChange}
              />
            </Field>

            <Field id="pv-portfolio" label="Portfolio website">
              <input
                id="pv-portfolio"
                name="portfolioUrl"
                inputMode="url"
                autoComplete="off"
                value={form.portfolioUrl}
                onChange={handleChange}
              />
            </Field>
          </div>

          {saveMessage && (
            <p className="pv-save-message" role="status">
              {saveMessage}
            </p>
          )}

          <button type="submit" className="pv-save-btn" disabled={savingFields}>
            {savingFields ? "Saving..." : "Save details"}
          </button>
        </form>

        {/* documents + AI */}
        <div className="pv-card">
          <h2 className="pv-card__title">Documents & AI analysis</h2>

          <div className="pv-uploads">
            <FileDropField
              id="pv-cv"
              label="CV"
              currentFileName={profile.cv_file_name}
              file={newCvFile}
              onSelect={setNewCvFile}
            />
            <FileDropField
              id="pv-transcript"
              label="Academic transcript"
              currentFileName={profile.transcript_file_name}
              file={newTranscriptFile}
              onSelect={setNewTranscriptFile}
            />
          </div>

          {!aiRunning ? (
            <>
              {hasResults && (
                <p className="pv-ai-status pv-ai-status--done">
                  <CheckCircle2 size={14} /> Last analyzed{" "}
                  {new Date(profile.ai_processed_at).toLocaleString()}
                </p>
              )}
              {hasFailed && (
                <p className="pv-ai-status pv-ai-status--failed" role="alert">
                  <AlertCircle size={14} aria-hidden="true" /> Last analysis
                  failed: {profile.ai_processing_error}
                </p>
              )}
              {aiError && (
                <p className="pv-ai-status pv-ai-status--failed" role="alert">
                  <AlertCircle size={14} aria-hidden="true" /> {aiError}
                </p>
              )}

              <button className="pv-ai-btn" onClick={handleRunAI}>
                <Sparkles size={15} />
                {hasResults ? "Re-run AI analysis" : "Run AI analysis"}
              </button>
            </>
          ) : (
            <div className="pv-progress" role="status" aria-live="polite">
              {STEPS.map((step) => {
                const order = STEPS.findIndex((s) => s.key === step.key);
                const currentOrder = STEPS.findIndex((s) => s.key === aiStep);
                const isDone = order < currentOrder || aiStep === "done";
                const isActive = step.key === aiStep;
                return (
                  <div
                    key={step.key}
                    className={`pv-progress-row${isDone ? " pv-progress-row--done" : ""}${isActive ? " pv-progress-row--active" : ""}`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} aria-hidden="true" />
                    ) : isActive ? (
                      <Loader2
                        size={16}
                        className="pv-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="pv-progress-dot" aria-hidden="true" />
                    )}

                    <span>
                      {step.label}

                      {isDone && <span className="sr-only"> (done)</span>}
                      {isActive && (
                        <span className="sr-only"> (in progress)</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {hasResults && (
        <div className="pv-card pv-results">
          <h2 className="pv-card__title">AI-generated profile summary</h2>

          {profile.professional_summary && (
            <div className="pv-summary-card">
              <p className="pv-summary-card__label">
                <Sparkles size={13} /> AI-generated summary
              </p>
              <p className="pv-summary">{profile.professional_summary}</p>
            </div>
          )}

          {profile.extracted_technical_skills?.length > 0 && (
            <div className="pv-results-section">
              <h3 className="pv-results-section__title">Technical skills</h3>
              <div className="pv-chip-row">
                {profile.extracted_technical_skills.map((s, i) => (
                  <SkillChip key={i} label={s.skill} type="technical" />
                ))}
              </div>
            </div>
          )}

          {profile.extracted_soft_skills?.length > 0 && (
            <div className="pv-results-section">
              <h3 className="pv-results-section__title">Soft skills</h3>
              <div className="pv-chip-row">
                {profile.extracted_soft_skills.map((s, i) => (
                  <SkillChip key={i} label={s.skill} type="soft" />
                ))}
              </div>
            </div>
          )}

          {profile.translated_projects?.length > 0 && (
            <div className="pv-results-section">
              <h3 className="pv-results-section__title">Projects</h3>
              <div className="pv-projects">
                {profile.translated_projects.map((p, i) => {
                  const isExpanded = expandedProjects.has(i);
                  const isLong = (p.description?.length ?? 0) > 140;

                  return (
                    <div key={i} className="pv-project-card">
                      <div className="pv-project-card__title">
                        {p.professional_title}
                      </div>
                      <div className="pv-project-card__original">
                        Originally: {p.original_title}
                      </div>
                      <p
                        className={`pv-project-card__desc${!isExpanded && isLong ? " pv-project-card__desc--clamped" : ""}`}
                      >
                        {p.description}
                      </p>
                      {isLong && (
                        <button
                          type="button"
                          className="pv-project-card__toggle"
                          onClick={() => toggleProject(i)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      )}
                      <div className="pv-chip-row">
                        {p.skills_demonstrated?.map((s, j) => (
                          <SkillChip key={j} label={s} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
