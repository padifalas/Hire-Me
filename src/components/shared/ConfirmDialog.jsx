import { useId } from "react";
import useDialog from "../../hooks/useDialog";
import "./ConfirmDialog.css";

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  busyLabel,
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}) {
  const titleId = useId();
  const descId = useId();
  const ref = useDialog({ onClose: onCancel, closeDisabled: busy });

  return (
    <div
      className="cfm-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={ref}
        className="cfm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        <h2 id={titleId} className="cfm-title">
          {title}
        </h2>
        {description && (
          <p id={descId} className="cfm-desc">
            {description}
          </p>
        )}
        <div className="cfm-actions">
          <button
            type="button"
            className="cfm-btn cfm-btn--cancel"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`cfm-btn ${danger ? "cfm-btn--danger" : "cfm-btn--primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && busyLabel ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
