import { useState, useEffect } from "react";
import {
  getStudentProfile,
  updateStudentProfile,
  uploadDocument,
  extractTextFromStoredDocument,
  triggerSkillExtraction,
} from "../../services/documentService";

import "./ProfileView.css";

import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 2 + i);

const STEPS = [
  { key: "reading", label: "Reading CV & transcript" },
  { key: "extracting", label: "Extracting skills with AI" },
  { key: "done", label: "Done" },
];

function FileDropField({ label, currentFileName, file, onSelect }) {
  return (
    <div className="pv-file-field">
      <label className="pv-file-field__label">{label}</label>
      <label
        className={`pv-dropzone${file || currentFileName ? " pv-dropzone--filled" : ""}`}
      >
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
          hidden
        />
        <FileText size={16} />
        <span className="pv-dropzone__filename">
          {file ? file.name : currentFileName || "No file uploaded yet"}
        </span>
        <span className="pv-dropzone__action">
          <UploadCloud size={14} />{" "}
          {currentFileName || file ? "Replace" : "Upload"}
        </span>
      </label>
    </div>
  );
}

function SkillChip({ label, type = "technical" }) {
  return (
    <span className={`pv-skill-chip pv-skill-chip--${type}`}>{label}</span>
  );
}

export default function ProfileView({ user }) {
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
    return <div className="pv-loading">Loading your profile...</div>;
  }

  if (!profile || !form) {
    return (
      <div className="pv-loading">
        Couldn't load your profile. Try refreshing.
      </div>
    );
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

      <div className="pv-grid-layout">
        {/* u can edit these fields */}
        <form onSubmit={handleSaveFields} className="pv-card">
          <h2 className="pv-card__title">Academic & contact details</h2>
          <div className="pv-fields-grid">
            <div className="pv-field">
              <label>University</label>
              <input
                name="university"
                value={form.university}
                onChange={handleChange}
              />
            </div>
            <div className="pv-field">
              <label>Qualification</label>
              <input
                name="qualification"
                value={form.qualification}
                onChange={handleChange}
              />
            </div>
            <div className="pv-field">
              <label>Graduation year</label>
              <select
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
            </div>
            <div className="pv-field">
              <label>Location (city)</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
              />
            </div>
            <div className="pv-field">
              <label>Phone number</label>
              <input name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="pv-field">
              <label>LinkedIn URL</label>
              <input
                name="linkedinUrl"
                value={form.linkedinUrl}
                onChange={handleChange}
              />
            </div>
            <div className="pv-field">
              <label>GitHub URL</label>
              <input
                name="githubUrl"
                value={form.githubUrl}
                onChange={handleChange}
              />
            </div>
            <div className="pv-field">
              <label>Portfolio website</label>
              <input
                name="portfolioUrl"
                value={form.portfolioUrl}
                onChange={handleChange}
              />
            </div>
          </div>

          {saveMessage && <p className="pv-save-message">{saveMessage}</p>}

          <button type="submit" className="pv-save-btn" disabled={savingFields}>
            {savingFields ? "Saving..." : "Save details"}
          </button>
        </form>

        {/* documents + AI */}
        <div className="pv-card">
          <h2 className="pv-card__title">Documents & AI analysis</h2>

          <div className="pv-uploads">
            <FileDropField
              label="CV"
              currentFileName={profile.cv_file_name}
              file={newCvFile}
              onSelect={setNewCvFile}
            />
            <FileDropField
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
                <p className="pv-ai-status pv-ai-status--failed">
                  <AlertCircle size={14} /> Last analysis failed:{" "}
                  {profile.ai_processing_error}
                </p>
              )}
              {aiError && (
                <p className="pv-ai-status pv-ai-status--failed">
                  <AlertCircle size={14} /> {aiError}
                </p>
              )}

              <button className="pv-ai-btn" onClick={handleRunAI}>
                <Sparkles size={15} />
                {hasResults ? "Re-run AI analysis" : "Run AI analysis"}
              </button>
            </>
          ) : (
            <div className="pv-progress">
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
                      <CheckCircle2 size={16} />
                    ) : isActive ? (
                      <Loader2 size={16} className="pv-spin" />
                    ) : (
                      <span className="pv-progress-dot" />
                    )}
                    <span>{step.label}</span>
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
            <p className="pv-summary">{profile.professional_summary}</p>
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
                {profile.translated_projects.map((p, i) => (
                  <div key={i} className="pv-project-card">
                    <div className="pv-project-card__title">
                      {p.professional_title}
                    </div>
                    <div className="pv-project-card__original">
                      Originally: {p.original_title}
                    </div>
                    <p className="pv-project-card__desc">{p.description}</p>
                    <div className="pv-chip-row">
                      {p.skills_demonstrated?.map((s, j) => (
                        <SkillChip key={j} label={s} type="technical" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
