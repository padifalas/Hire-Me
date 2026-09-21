import { useState, useEffect } from "react";
import {
  getDocumentSignedUrl,
  extractTextFromStoredDocument,
} from "../../services/documentService";

import "./DocumentViewerModal.css";

import { X, Download, Loader2, AlertCircle } from "lucide-react";

function isPdfPath(path) {
  return path?.toLowerCase().endsWith(".pdf");
}

export default function DocumentViewerModal({
  docType, // 'cv' | 'transcript'
  storagePath,
  fileName,
  subjectName, // e.g. student's name, for the modal title
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);
  const [textPreview, setTextPreview] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const isPdf = isPdfPath(storagePath) || isPdfPath(fileName);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      const urlResult = await getDocumentSignedUrl(docType, storagePath);
      if (cancelled) return;

      if (!urlResult.success) {
        setError(urlResult.error);
        setLoading(false);
        return;
      }
      setSignedUrl(urlResult.url);

      if (!isPdf) {
        const textResult = await extractTextFromStoredDocument(
          docType,
          storagePath,
        );
        if (cancelled) return;
        if (textResult.success) {
          setTextPreview(textResult.text);
        } else {
          setError(textResult.error);
        }
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [docType, storagePath, isPdf]);

  async function handleDownload() {
    if (!signedUrl) return;
    setDownloading(true);
    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName || `${docType}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const label = docType === "cv" ? "CV" : "Academic transcript";

  return (
    <div className="dvm-backdrop" onClick={onClose}>
      <div className="dvm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dvm-header">
          <div>
            <p className="dvm-title">
              {label}
              {subjectName ? ` · ${subjectName}` : ""}
            </p>
            {fileName && <p className="dvm-filename">{fileName}</p>}
          </div>
          <div className="dvm-header-actions">
            <button
              className="dvm-download-btn"
              onClick={handleDownload}
              disabled={!signedUrl || downloading}
            >
              <Download size={14} />
              {downloading ? "Downloading..." : "Download"}
            </button>
            <button className="dvm-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="dvm-body">
          {loading && (
            <div className="dvm-status">
              <Loader2 size={20} className="dvm-spin" />
              Loading document...
            </div>
          )}

          {!loading && error && (
            <div className="dvm-status dvm-status--error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {!loading && !error && isPdf && signedUrl && (
            <iframe
              src={signedUrl}
              title={`${label} preview`}
              className="dvm-pdf-frame"
            />
          )}

          {!loading && !error && !isPdf && textPreview && (
            <div className="dvm-text-preview">
              <p className="dvm-text-preview__note">
                Word documents show as plain text here — formatting isn't
                preserved. Download for the original layout.
              </p>
              <pre className="dvm-text-preview__body">{textPreview}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
