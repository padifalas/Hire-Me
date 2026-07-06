import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  uploadDocument,
  triggerSkillExtraction,
  updateStudentProfile,
} from "../../services/documentService";

import "./ProfileSetup.css";

import { UploadCloud, FileText, CheckCircle2, Loader2 } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 2 + i);

// does a lil progress list shown while the pipeline runs
const STEPS = [
  { key: "uploading", label: "Uploading documents" },
  { key: "reading", label: "Reading CV & transcript" },
  { key: "extracting", label: "Extracting skills with AI" },
  { key: "done", label: "Profile ready" },
];

function FileDropField({ label, required, file, onSelect, hint }) {
  return (
    <div className="ps-file-field">
      <label className="ps-file-field__label">
        {label} {required && <span className="ps-required">*</span>}
      </label>

      <label className={`ps-dropzone${file ? " ps-dropzone--filled" : ""}`}>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
          hidden
        />
        {file ? (
          <>
            <FileText size={18} />
            <span className="ps-dropzone__filename">{file.name}</span>
          </>
        ) : (
          <>
            <UploadCloud size={18} />
            <span>Click to upload PDF or DOCX (max 5MB)</span>
          </>
        )}
      </label>
      {hint && <p className="ps-file-field__hint">{hint}</p>}
    </div>
  );
}

export default function ProfileSetup() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    university: "",
    qualification: "",
    graduationYear: CURRENT_YEAR,
    location: "",
    phone: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
  });

  const [cvFile, setCvFile] = useState(null);
  const [transcriptFile, setTranscriptFile] = useState(null);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validate() {
    if (!form.university || !form.qualification || !form.location || !form.phone) {
      return "Please fill in university, qualification, location, and phone number.";
    }
    if (!cvFile) {
      return "A CV upload is required.";
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
      // 1. Save the plain profile fields
      setCurrentStep("uploading");
      const profileResult = await updateStudentProfile(user.id, form);
      if (!profileResult.success) throw new Error(profileResult.error);

      // 2. Upload CV (required) and transcript (optional), extracting text
      //    from each as we go
      const cvResult = await uploadDocument(cvFile, user.id, "cv");
      if (!cvResult.success) throw new Error(cvResult.error);

      let transcriptText = "";
      if (transcriptFile) {
        const transcriptResult = await uploadDocument(transcriptFile, user.id, "transcript");
        if (!transcriptResult.success) throw new Error(transcriptResult.error);
        transcriptText = transcriptResult.extractedText;
      }

      // 3. Kick off AI skill extraction + project translation
      setCurrentStep("extracting");
      const aiResult = await triggerSkillExtraction(user.id, cvResult.extractedText, transcriptText);
      if (!aiResult.success) throw new Error(aiResult.error);

      setCurrentStep("done");
      setTimeout(() => navigate("/student-dashboard"), 900);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
      setCurrentStep(null);
    }
  }

  return (
    <div className="ps-page">
      <div className="ps-card">
        <div className="ps-header">
          <span className="ps-logo">
            HireMe<span className="ps-logo-dot">.</span>
          </span>
          <h1 className="ps-title">Complete your profile</h1>
          <p className="ps-subtitle">
            {userProfile?.full_name ? `Hi ${userProfile.full_name.split(" ")[0]}, ` : ""}
            this helps us match you with the right opportunities and turn your
            coursework into skills employers understand.
          </p>
        </div>

        {!submitting ? (
          <form onSubmit={handleSubmit} className="ps-form">
            <div className="ps-section">
              <h2 className="ps-section__title">Academic details</h2>
              <div className="ps-grid">
                <div className="ps-field">
                  <label>University *</label>
                  <input
                    name="university"
                    value={form.university}
                    onChange={handleChange}
                    placeholder="University of Witwatersrand"
                    required
                  />
                </div>
                <div className="ps-field">
                  <label>Qualification *</label>
                  <input
                    name="qualification"
                    value={form.qualification}
                    onChange={handleChange}
                    placeholder="BSc Computer Science"
                    required
                  />
                </div>
                <div className="ps-field">
                  <label>Graduation year *</label>
                  <select name="graduationYear" value={form.graduationYear} onChange={handleChange}>
                    {GRAD_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="ps-field">
                  <label>Location (city) *</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Johannesburg"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="ps-section">
              <h2 className="ps-section__title">Contact & links</h2>
              <div className="ps-grid">
                <div className="ps-field">
                  <label>Phone number *</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="082 123 4567"
                    required
                  />
                </div>
                <div className="ps-field">
                  <label>LinkedIn URL</label>
                  <input
                    name="linkedinUrl"
                    value={form.linkedinUrl}
                    onChange={handleChange}
                    placeholder="linkedin.com/in/yourname"
                  />
                </div>
                <div className="ps-field">
                  <label>GitHub URL</label>
                  <input
                    name="githubUrl"
                    value={form.githubUrl}
                    onChange={handleChange}
                    placeholder="github.com/yourname"
                  />
                </div>
                <div className="ps-field">
                  <label>Portfolio website</label>
                  <input
                    name="portfolioUrl"
                    value={form.portfolioUrl}
                    onChange={handleChange}
                    placeholder="yourname.dev"
                  />
                </div>
              </div>
            </div>

            <div className="ps-section">
              <h2 className="ps-section__title">Documents</h2>
              <div className="ps-uploads">
                <FileDropField
                  label="CV"
                  required
                  file={cvFile}
                  onSelect={setCvFile}
                  hint="We'll extract your skills and experience from this automatically."
                />
                <FileDropField
                  label="Academic transcript"
                  file={transcriptFile}
                  onSelect={setTranscriptFile}
                  hint="Optional, but helps us translate your coursework into recognized skills."
                />
              </div>
            </div>

            {error && <p className="ps-error">{error}</p>}

            <button type="submit" className="ps-submit">
              Save & analyze my profile
            </button>
          </form>
        ) : (
          <div className="ps-progress">
            {STEPS.map((step, i) => {
              const stepIndex = STEPS.findIndex((s) => s.key === currentStep);
              const isDone = i < stepIndex || currentStep === "done";
              const isActive = step.key === currentStep;
              return (
                <div
                  key={step.key}
                  className={`ps-progress-row${isDone ? " ps-progress-row--done" : ""}${isActive ? " ps-progress-row--active" : ""}`}
                >
                  {isDone ? (
                    <CheckCircle2 size={18} />
                  ) : isActive ? (
                    <Loader2 size={18} className="ps-spin" />
                  ) : (
                    <span className="ps-progress-dot" />
                  )}
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
