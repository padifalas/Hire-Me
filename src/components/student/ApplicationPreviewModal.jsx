import { useState, useEffect, useCallback } from "react";
import { generateCoverLetter, applyToOpportunity } from "../../services/opportunityService";

import "./ApplicationPreviewModal.css";

import { X, Sparkles, RotateCcw } from "lucide-react";

export default function ApplicationPreviewModal({ user, opportunity, matchScore, onClose, onSubmitted }) {
  const [coverLetter, setCoverLetter] = useState("");
  const [generating, setGenerating] = useState(true);
  const [genError, setGenError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const draftLetter = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    const result = await generateCoverLetter(user.id, opportunity.id);
    setGenerating(false);

    if (result.success) {
      setCoverLetter(result.coverLetter);
    } else {
      setGenError(result.error || "Couldn't generate a cover letter - you can still write your own below.");
    }
  }, [user.id, opportunity.id]);

  useEffect(() => {
    draftLetter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    const result = await applyToOpportunity(user.id, opportunity.id, matchScore, coverLetter || null);
    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error);
      return;
    }
    onSubmitted();
  }

  return (
    <div className="apm-overlay" onClick={onClose}>
      <div className="apm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="apm-modal__header">
          <div>
            <h2>Apply to {opportunity.title}</h2>
            <p className="apm-modal__subtitle">{opportunity.employer?.company_name ?? "Company"}</p>
          </div>
          <button type="button" className="apm-close-btn" onClick={onClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <div className="apm-modal__body">
          <div className="apm-cover-letter__label-row">
            <span className="apm-cover-letter__label">Cover letter</span>
            <button
              type="button"
              className="apm-regen-btn"
              onClick={draftLetter}
              disabled={generating || submitting}
            >
              {generating ? (
                <>
                  <Sparkles size={12} /> Drafting...
                </>
              ) : (
                <>
                  <RotateCcw size={12} /> Regenerate
                </>
              )}
            </button>
          </div>

          {genError && <p className="apm-error">{genError}</p>}

          <textarea
            className="apm-textarea"
            value={generating ? "Drafting your cover letter..." : coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            disabled={generating}
            rows={14}
            placeholder="Write or paste your cover letter here..."
          />
          <p className="apm-hint">
            AI-drafted based on your real skills and projects - review and edit before submitting.
          </p>

          {submitError && <p className="apm-error">{submitError}</p>}

          <div className="apm-modal__actions">
            <button type="button" className="apm-cancel-btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="apm-submit-btn"
              onClick={handleSubmit}
              disabled={generating || submitting}
            >
              {submitting ? "Submitting..." : "Submit application"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
