import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getEmployerOpportunities,
  closeOpportunity,
} from "../../services/employerService";
import JobPostingForm from "./JobPostingForm.jsx";
import ApplicantsModal from "./ApplicantsModal.jsx";
import ConfirmDialog from "../shared/ConfirmDialog.jsx";

import "./JobsView.css";

import { Plus, Pencil, XCircle, Briefcase, Users } from "lucide-react";

const STATUS_LABELS = {
  active: { label: "Active", color: "#16a34a", bg: "#dcfce7" },
  expired: { label: "Expired", color: "#dc2626", bg: "#fee2e2" },
  draft: { label: "Draft", color: "#64748b", bg: "#f1f5f9" },
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
    .join("-");
}

export default function JobsView({
  employerId,
  searchQuery = "",
  highlightJobId,
  onHighlightHandled,
}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [closingJob, setClosingJob] = useState(null);
  const [closing, setClosing] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef(null);
  const [activeHighlight, setActiveHighlight] = useState(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const result = await getEmployerOpportunities(employerId);
    if (result.success) setJobs(result.opportunities);
    setLoading(false);
  }, [employerId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!highlightJobId || loading) return;

    setActiveFilter("All"); // a closed/expired job must not be hidden by a filter
    setActiveHighlight(highlightJobId);

    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`job-${highlightJobId}`);
      if (!el) return;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el.scrollIntoView({
        block: "center",
        behavior: reduceMotion ? "auto" : "smooth",
      });
      el.focus({ preventScroll: true });
    }, 60);

    const clearTimer = setTimeout(() => {
      setActiveHighlight(null);
      onHighlightHandled?.();
    }, 6000);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightJobId, loading, onHighlightHandled]);

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
    const byStatus =
      activeFilter === "All"
        ? jobsWithDisplayStatus
        : jobsWithDisplayStatus.filter(
            (j) => j._displayStatus === activeFilter.toLowerCase(),
          );

    const q = searchQuery.trim().toLowerCase();
    if (!q) return byStatus;

    return byStatus.filter((j) =>
      [
        j.title,
        j.location,
        formatJobType(j.job_type),
        STATUS_LABELS[j._displayStatus]?.label,
      ].some((f) =>
        String(f ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [jobsWithDisplayStatus, activeFilter, searchQuery]);

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

  async function confirmClose() {
    if (!closingJob || closing) return;

    setClosing(true);

    try {
      const result = await closeOpportunity(closingJob.id);
      const title = closingJob.title;

      if (result.success) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === closingJob.id ? { ...j, status: "closed" } : j,
          ),
        );

        setAnnouncement(`${title} has been closed.`);
      } else {
        setAnnouncement(`Couldn't close ${title}. Please try again.`);
        loadJobs();
      }
    } catch (error) {
      console.error("Error closing job:", error);
      setAnnouncement(`Couldn't close ${closingJob.title}. Please try again.`);
    } finally {
      setClosing(false);
      setClosingJob(null);
      requestAnimationFrame(() => titleRef.current?.focus());
    }
  }

  return (
    <div className="jv-root">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <div className="jv-header">
        <div>
          <h1 className="jv-title" ref={titleRef} tabIndex={-1}>
            My Jobs
          </h1>
          <p className="jv-subtitle" role="status">
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
        <div
          className="jv-filter-row"
          role="group"
          aria-label="Filter jobs by status"
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              aria-pressed={activeFilter === f}
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
          <Briefcase size={32} strokeWidth={1.5} aria-hidden="true" />
          <p>You haven't posted any jobs yet.</p>
          <button className="jv-post-btn" onClick={() => setShowForm(true)}>
            <Plus size={14} aria-hidden="true" /> Post your first job
          </button>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="jv-card">
          <div role="table" aria-label="Your job postings">
            <div className="jv-table-header" role="row">
              {[
                "Job Title",
                "Type",
                "Applications",
                "Deadline",
                "Status",
                "Actions",
              ].map((h) => (
                <span
                  key={h}
                  className={`jv-table-th${h === "Actions" ? " sr-only" : ""}`}
                  role="columnheader"
                >
                  {h}
                </span>
              ))}
            </div>

            {filteredJobs.map((job) => {
              const status =
                STATUS_LABELS[job._displayStatus] ?? STATUS_LABELS.draft;
              const remaining = daysUntil(job.deadline);
              const isExpired = job._displayStatus === "expired";
              const applicationCount = job.applicationCount ?? 0;

              return (
                <div
                  key={job.id}
                  id={`job-${job.id}`}
                  tabIndex={-1}
                  className={`jv-table-row${job.id === activeHighlight ? " jv-table-row--highlighted" : ""}`}
                  role="row"
                >
                  <span
                    className="jv-table-cell jv-table-cell--title"
                    role="cell"
                  >
                    {job.title}
                  </span>

                  <span className="jv-table-cell" role="cell" data-label="Type">
                    {formatJobType(job.job_type)}
                  </span>

                  <span
                    className="jv-table-cell"
                    role="cell"
                    data-label="Applications"
                  >
                    <button
                      type="button"
                      className="jv-applicants-link"
                      onClick={() => setViewingJob(job)}
                      disabled={applicationCount === 0}
                      aria-label={`${applicationCount} applicant${applicationCount === 1 ? "" : "s"} for ${job.title}`}
                    >
                      {applicationCount}
                    </button>
                  </span>

                  <span
                    role="cell"
                    data-label="Deadline"
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

                  <span role="cell" data-label="Status">
                    <span
                      className="jv-status-badge"
                      style={{
                        color: status.color,
                        background: status.bg,
                      }}
                    >
                      {status.label}
                    </span>
                  </span>

                  <div className="jv-row-actions" role="cell">
                    <button
                      type="button"
                      className="jv-icon-btn"
                      onClick={() => setViewingJob(job)}
                      aria-label={`View applicants for ${job.title}`}
                    >
                      <Users size={14} aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      className="jv-icon-btn"
                      onClick={() => setEditingJob(job)}
                      aria-label={`Edit ${job.title}`}
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>

                    {job.status !== "closed" && (
                      <button
                        type="button"
                        className="jv-icon-btn jv-icon-btn--danger"
                        onClick={() => setClosingJob(job)}
                        aria-label={`Close posting for ${job.title}`}
                      >
                        <XCircle size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredJobs.length === 0 && (
            <p className="jv-empty-inline" role="status">
              {searchQuery.trim()
                ? `No jobs match "${searchQuery.trim()}".`
                : `No ${activeFilter.toLowerCase()} jobs.`}
            </p>
          )}
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
      {closingJob && (
        <ConfirmDialog
          title={`Close "${closingJob.title}"?`}
          description="Students won't be able to apply anymore. Existing applications are kept."
          confirmLabel="Close posting"
          busyLabel="Closing..."
          danger
          busy={closing}
          onCancel={() => setClosingJob(null)}
          onConfirm={confirmClose}
        />
      )}
    </div>
  );
}
