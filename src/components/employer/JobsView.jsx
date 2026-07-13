import { useState, useEffect, useCallback } from "react";
import { getEmployerOpportunities, closeOpportunity } from "../../services/employerService";
import JobPostingForm from "./JobPostingForm.jsx";

import "./JobsView.css";

import { Plus, Pencil, XCircle, Briefcase } from "lucide-react";

const STATUS_LABELS = {
  active: { label: "Active", color: "#16a34a", bg: "#f0fdf4" },
  draft: { label: "Draft", color: "#94a3b8", bg: "#f8fafc" },
  closed: { label: "Closed", color: "#dc2626", bg: "#fef2f2" },
};

function daysUntil(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function JobsView({ employerId }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const result = await getEmployerOpportunities(employerId);
    if (result.success) setJobs(result.opportunities);
    setLoading(false);
  }, [employerId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  function handleSaved() {
    setShowForm(false);
    setEditingJob(null);
    loadJobs();
  }

  async function handleClose(jobId) {
    if (!confirm("Close this job posting? Students won't be able to apply anymore.")) return;
    await closeOpportunity(jobId);
    loadJobs();
  }

  return (
    <div className="jv-root">
      <div className="jv-header">
        <div>
          <h1 className="jv-title">My Jobs</h1>
          <p className="jv-subtitle">
            {loading ? "Loading..." : `${jobs.length} job posting${jobs.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button className="jv-post-btn" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Post new job
        </button>
      </div>

      {!loading && jobs.length === 0 && (
        <div className="jv-empty">
          <Briefcase size={32} strokeWidth={1.5} />
          <p>You haven't posted any jobs yet.</p>
          <button className="jv-post-btn" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Post your first job
          </button>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="jv-card">
          <div className="jv-table-header">
            {["Job Title", "Type", "Applications", "Deadline", "Status", ""].map((h) => (
              <span key={h} className="jv-table-th">{h}</span>
            ))}
          </div>

          {jobs.map((job) => {
            const status = STATUS_LABELS[job.status] ?? STATUS_LABELS.draft;
            const remaining = daysUntil(job.deadline);
            return (
              <div key={job.id} className="jv-table-row">
                <span className="jv-table-cell jv-table-cell--title">{job.title}</span>
                <span className="jv-table-cell">{job.job_type}</span>
                <span className="jv-table-cell">{job.applicationCount}</span>
                <span className="jv-table-cell jv-table-cell--muted">
                  {remaining === null ? "No deadline" : remaining >= 0 ? `${remaining} days` : "Expired"}
                </span>
                <span
                  className="jv-status-badge"
                  style={{ color: status.color, background: status.bg }}
                >
                  {status.label}
                </span>
                <div className="jv-row-actions">
                  <button
                    className="jv-icon-btn"
                    title="Edit"
                    onClick={() => setEditingJob(job)}
                  >
                    <Pencil size={14} />
                  </button>
                  {job.status !== "closed" && (
                    <button
                      className="jv-icon-btn jv-icon-btn--danger"
                      title="Close posting"
                      onClick={() => handleClose(job.id)}
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showForm || editingJob) && (
        <JobPostingForm
          employerId={employerId}
          existingJob={editingJob}
          onClose={() => {
            setShowForm(false);
            setEditingJob(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
