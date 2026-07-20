import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getEmployerOpportunities,
  closeOpportunity,
} from "../../services/employerService";
import JobPostingForm from "./JobPostingForm.jsx";
import ApplicantsModal from "./ApplicantsModal.jsx";

import "./JobsView.css";

import { Plus, Pencil, XCircle, Briefcase, Users } from "lucide-react";

const STATUS_LABELS = {
  active: { label: "Active", color: "#16a34a", bg: "#f0fdf4" },
  expired: { label: "Expired", color: "#dc2626", bg: "#fef2f2" },
  draft: { label: "Draft", color: "#94a3b8", bg: "#f8fafc" },
  closed: { label: "Closed", color: "#64748b", bg: "#f1f5f9" },
};

const FILTERS = ["All", "Active", "Expired", "Draft"];

function daysUntil(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil(
    (new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

// The DB only stores active/draft/closed - "expired" is a derived display
// state for an active job whose deadline has passed. This does not change
// the stored status, only how it's labeled here.
function displayStatus(job) {
  if (job.status === "active") {
    const remaining = daysUntil(job.deadline);
    if (remaining !== null && remaining < 0) return "expired";
  }
  return job.status;
}

function formatJobType(type) {
  if (!type) return "-";
  return type
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function JobsView({ employerId }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const result = await getEmployerOpportunities(employerId);
    if (result.success) setJobs(result.opportunities);
    setLoading(false);
  }, [employerId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const jobsWithDisplayStatus = useMemo(
    () => jobs.map((j) => ({ ...j, _displayStatus: displayStatus(j) })),
    [jobs],
  );

  const filterCounts = useMemo(() => {
    const counts = {
      All: jobsWithDisplayStatus.length,
      Active: 0,
      Expired: 0,
      Draft: 0,
    };
    for (const j of jobsWithDisplayStatus) {
      if (j._displayStatus === "active") counts.Active += 1;
      else if (j._displayStatus === "expired") counts.Expired += 1;
      else if (j._displayStatus === "draft") counts.Draft += 1;
    }
    return counts;
  }, [jobsWithDisplayStatus]);

  const filteredJobs = useMemo(() => {
    if (activeFilter === "All") return jobsWithDisplayStatus;
    const key = activeFilter.toLowerCase();
    return jobsWithDisplayStatus.filter((j) => j._displayStatus === key);
  }, [jobsWithDisplayStatus, activeFilter]);

  function handleSaved(savedJob) {
    const wasEditing = Boolean(editingJob);
    setShowForm(false);
    setEditingJob(null);

    if (!savedJob) {
      // Fallback in case the form couldn't hand back the saved row for some
      // reason - re-fetch so the list is still correct.
      loadJobs();
      return;
    }

    // Update local state directly from the mutation response instead of
    // re-fetching the whole list + application-count aggregate on every
    // save - that round trip was the main source of the "takes too long to
    // save" feeling.
    setJobs((prev) =>
      wasEditing
        ? prev.map((j) =>
            j.id === savedJob.id
              ? { ...savedJob, applicationCount: j.applicationCount }
              : j,
          )
        : [{ ...savedJob, applicationCount: 0 }, ...prev],
    );
  }

  async function handleClose(jobId) {
    if (
      !confirm(
        "Close this job posting? Students won't be able to apply anymore.",
      )
    )
      return;
    const result = await closeOpportunity(jobId);
    if (result.success) {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: "closed" } : j)),
      );
    } else {
      loadJobs();
    }
  }

  return (
    <div className="jv-root">
      <div className="jv-header">
        <div>
          <h1 className="jv-title">My Jobs</h1>
          <p className="jv-subtitle">
            {loading
              ? "Loading..."
              : `${jobs.length} job posting${jobs.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button className="jv-post-btn" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Post new job
        </button>
      </div>

      {!loading && jobs.length > 0 && (
        <div className="jv-filter-row">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`jv-filter-pill${activeFilter === f ? " jv-filter-pill--active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}{" "}
              <span className="jv-filter-pill__count">{filterCounts[f]}</span>
            </button>
          ))}
        </div>
      )}

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
            {[
              "Job Title",
              "Type",
              "Applications",
              "Deadline",
              "Status",
              "",
            ].map((h) => (
              <span key={h} className="jv-table-th">
                {h}
              </span>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <p className="jv-empty-inline">
              No {activeFilter.toLowerCase()} jobs.
            </p>
          )}

          {filteredJobs.map((job) => {
            const status =
              STATUS_LABELS[job._displayStatus] ?? STATUS_LABELS.draft;
            const remaining = daysUntil(job.deadline);
            const isExpired = job._displayStatus === "expired";
            return (
              <div key={job.id} className="jv-table-row">
                <span className="jv-table-cell jv-table-cell--title">
                  {job.title}
                </span>
                <span className="jv-table-cell">
                  {formatJobType(job.job_type)}
                </span>
                <span className="jv-table-cell">
                  <button
                    type="button"
                    className="jv-applicants-link"
                    onClick={() => setViewingJob(job)}
                    disabled={job.applicationCount === 0}
                  >
                    {job.applicationCount}
                  </button>
                </span>
                <span
                  className={`jv-table-cell${isExpired ? " jv-table-cell--expired" : " jv-table-cell--muted"}`}
                >
                  {job.deadline
                    ? new Date(job.deadline).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : remaining === null
                      ? "No deadline"
                      : `${remaining} days`}
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
                    title="View applicants"
                    onClick={() => setViewingJob(job)}
                  >
                    <Users size={14} />
                  </button>
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

      {viewingJob && (
        <ApplicantsModal
          opportunityId={viewingJob.id}
          jobTitle={viewingJob.title}
          onClose={() => setViewingJob(null)}
        />
      )}
    </div>
  );
}
