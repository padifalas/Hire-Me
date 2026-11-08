import { useState, useEffect, useCallback } from "react";
import {
  generateCoverLetter,
  applyToOpportunity,
} from "../../services/opportunityService";
import useDialog from "../../hooks/useDialog";

import "./ApplicationPreviewModal.css";

import { X, Sparkles, RotateCcw } from "lucide-react";

export default function ApplicationPreviewModal({
  user,
  opportunity,
  onClose,
  onSubmitted,
}) {
  const [coverLetter, setCoverLetter] = useState("");
  const [generating, setGenerating] = useState(true);
  const [genError, setGenError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const dialogRef = useDialog({ onClose, closeDisabled: submitting });

  const draftLetter = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    const result = await generateCoverLetter(user.id, opportunity.id);
    setGenerating(false);

    if (result.success) {
      setCoverLetter(result.coverLetter);
    } else {
      setGenError(
        result.error ||
          "Couldn't generate a cover letter - you can still write your own below.",
      );
    }
  }, [user.id, opportunity.id]);

  useEffect(() => {
    draftLetter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    const result = await applyToOpportunity(
      user.id,
      opportunity.id,
      coverLetter || null,
    );
    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error);
      return;
    }
    onSubmitted();
  }

  const statusText = generating
    ? "Drafting your cover letter..."
    : genError
      ? ""
      : "Cover letter draft ready. Review and edit it before submitting.";

  return (
    <div
      className="apm-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="apm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apm-title"
        aria-describedby="apm-subtitle"
        tabIndex={-1}
      >
        <div className="apm-modal__header">
          <div>
            <h2>Apply to {opportunity.title}</h2>
            <p className="apm-modal__subtitle" id="apm-subtitle">
              {opportunity.employer?.company_name ?? "Company"}
            </p>
          </div>
          <button
            type="button"
            className="apm-close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close application preview"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="apm-modal__body">
          <p className="sr-only" role="status" aria-live="polite">
            {statusText}
          </p>

          <div className="apm-cover-letter__label-row">
            <label
              htmlFor="apm-cover-letter"
              className="apm-cover-letter__label"
            >
              Cover letter
            </label>
            <button
              type="button"
              className="apm-regen-btn"
              onClick={draftLetter}
              disabled={generating || submitting}
            >
              {generating ? (
                <>
                  <Sparkles size={12} aria-hidden="true" /> Drafting...
                </>
              ) : (
                <>
                  <RotateCcw size={12} aria-hidden="true" /> Regenerate
                </>
              )}
            </button>
          </div>

          {genError && (
            <p className="apm-error" role="alert">
              {genError}
            </p>
          )}

          <textarea
            id="apm-cover-letter"
            className="apm-textarea"
            value={generating ? "" : coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            disabled={generating}
            aria-busy={generating}
            aria-describedby="apm-hint"
            rows={14}
            placeholder={
              generating
                ? "Drafting your cover letter..."
                : "Write your cover letter here..."
            }
          />
          <p className="apm-hint" id="apm-hint">
            AI-drafted based on your real skills and projects - review and edit
            before submitting.
          </p>

          {submitError && (
            <p className="apm-error" role="alert">
              {submitError}
            </p>
          )}

          <div className="apm-modal__actions">
            <button
              type="button"
              className="apm-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
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
