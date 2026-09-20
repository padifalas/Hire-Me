import { useState, useEffect, useCallback } from "react";
import {
  getEmployerAnalytics,
  getEmployerBeeStats,
  BEE_MIN_POOL_SIZE,
} from "../../services/employerService";

import "./AnalyticsView.css";

import { TrendingUp, TrendingDown } from "lucide-react";

const BEE_CATEGORIES = [
  { key: "black_african", label: "Black/African", color: "#dc4c1e" },
  { key: "coloured", label: "Coloured", color: "#f0a500" },
  { key: "indian", label: "Indian", color: "#f97316" },
  { key: "white", label: "White", color: "#d1d5db" },
];

const SCORE_COLORS = {
  "0-39": "#64748b",
  "40-59": "#dc4c1e",
  "60-79": "#f0a500",
  "80-100": "#16a34a",
};

// Round up to the nearest even number so the midpoint gridline is always a
// whole number (17 -> 18, midpoint 9).
function niceMax(value) {
  if (!value || value <= 0) return 4;
  return Math.ceil(value / 2) * 2;
}

function StatCard({ value, label, delta, invertDelta = false }) {
  // For "time to review", a drop is good - flip which direction reads green.
  const isPositive =
    delta === null ? null : invertDelta ? delta < 0 : delta > 0;
  const Icon = delta !== null && delta < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="av-stat-card">
      <div className="av-stat-card__value">{value}</div>
      <div className="av-stat-card__label">{label}</div>
      {delta !== null && (
        <div
          className={`av-stat-card__delta${isPositive ? " av-stat-card__delta--up" : " av-stat-card__delta--down"}`}
        >
          <Icon size={13} />
          {delta > 0 ? "+" : ""}
          {delta}% vs last month
        </div>
      )}
    </div>
  );
}

function ApplicationsChart({ data }) {
  if (data.length === 0) {
    return <p className="av-empty">No applications yet.</p>;
  }

  const maxY = niceMax(Math.max(...data.map((d) => d.value)));
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const w = 700;
  const h = 240;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const x = (i) =>
    data.length === 1
      ? padL + plotW / 2
      : padL + (i / (data.length - 1)) * plotW;
  const y = (v) => padT + (1 - v / maxY) * plotH;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.value)}`)
    .join(" ");

  const areaPath = `${linePath} L ${x(data.length - 1)} ${padT + plotH} L ${x(0)} ${padT + plotH} Z`;

  const gridValues = [0, maxY / 2, maxY];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="av-chart-svg"
      preserveAspectRatio="none"
      role="img"
      aria-label="Applications over time"
    >
      <defs>
        <linearGradient id="avAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f34100" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f34100" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridValues.map((v) => (
        <g key={v}>
          <line
            x1={padL}
            y1={y(v)}
            x2={w - padR}
            y2={y(v)}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
          <text
            x={padL - 8}
            y={y(v) + 4}
            className="av-axis-label"
            textAnchor="end"
          >
            {v}
          </text>
        </g>
      ))}

      <path d={areaPath} fill="url(#avAreaFill)" />
      <path d={linePath} fill="none" stroke="#f34100" strokeWidth="2.5" />

      {data.map((d, i) => (
        <circle key={d.label} cx={x(i)} cy={y(d.value)} r="4" fill="#f34100" />
      ))}

      {data.map((d, i) => (
        <text
          key={`${d.label}-x`}
          x={x(i)}
          y={h - 8}
          className="av-axis-label"
          textAnchor="middle"
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}

function BeeBreakdownPanel({ totalPooled, breakdown }) {
  const hasEnoughData = totalPooled >= BEE_MIN_POOL_SIZE;

  return (
    <div className="ed-card">
      <div className="av-panel-header">
        <span className="ed-card__title">BEE Breakdown</span>
        {hasEnoughData && (
          <span className="av-panel-sub">{totalPooled} applicants pooled</span>
        )}
      </div>

      {!hasEnoughData ? (
        <div className="ed-bee-empty">
          <p className="ed-bee-empty__title">Not enough data yet</p>
          <p className="ed-bee-empty__hint">
            {totalPooled === 0
              ? "No applicants have shared this information yet."
              : `Only ${totalPooled} applicant${totalPooled === 1 ? " has" : "s have"} shared this so far. We show a breakdown once at least ${BEE_MIN_POOL_SIZE} responses are in, to keep individual answers private.`}
          </p>
        </div>
      ) : (
        <>
          <div className="av-bee-bar">
            {BEE_CATEGORIES.map((cat) => (
              <span
                key={cat.key}
                className="av-bee-bar__seg"
                style={{
                  width: `${breakdown[cat.key] ?? 0}%`,
                  background: cat.color,
                }}
              />
            ))}
          </div>

          <div className="av-bee-legend">
            {BEE_CATEGORIES.map((cat) => (
              <div key={cat.key} className="av-bee-legend__row">
                <span
                  className="av-bee-legend__dot"
                  style={{ background: cat.color }}
                />
                <span className="av-bee-legend__label">{cat.label}</span>
                <div className="av-bee-legend__track">
                  <div
                    className="av-bee-legend__fill"
                    style={{
                      width: `${breakdown[cat.key] ?? 0}%`,
                      background: cat.color,
                    }}
                  />
                </div>
                <span className="av-bee-legend__pct">
                  {Math.round(breakdown[cat.key] ?? 0)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ScoreDistribution({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="av-dist">
      {data.map((bucket) => (
        <div key={bucket.label} className="av-dist__col">
          <div className="av-dist__bar-wrap">
            <div
              className="av-dist__bar"
              style={{
                height: `${(bucket.count / max) * 100}%`,
                background: SCORE_COLORS[bucket.label],
              }}
            />
          </div>
          <div
            className="av-dist__count"
            style={{ color: SCORE_COLORS[bucket.label] }}
          >
            {bucket.count}
          </div>
          <div className="av-dist__label">{bucket.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsView({ employerId }) {
  const [analytics, setAnalytics] = useState(null);
  const [beeStats, setBeeStats] = useState({ totalPooled: 0, breakdown: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [analyticsResult, beeResult] = await Promise.all([
      getEmployerAnalytics(employerId),
      getEmployerBeeStats(employerId),
    ]);

    if (analyticsResult.success) setAnalytics(analyticsResult.analytics);
    else setError(analyticsResult.error);

    if (beeResult.success) {
      setBeeStats({
        totalPooled: beeResult.totalPooled,
        breakdown: beeResult.breakdown,
      });
    }

    setLoading(false);
  }, [employerId]);

  useEffect(() => {
    if (employerId) load();
  }, [employerId, load]);

  if (loading) return <div className="av-loading">Loading analytics...</div>;
  if (error)
    return <div className="av-loading">Couldn't load analytics: {error}</div>;
  if (!analytics) return null;

  return (
    <div className="av-root">
      <div className="av-header">
        <h1 className="av-title">Analytics</h1>
        <p className="av-subtitle">
          Recruitment insights across all active jobs
        </p>
      </div>

      <div className="av-stat-cards">
        <StatCard
          value={analytics.totalApplications}
          label="Total Applications"
          delta={analytics.deltas.applications}
        />
        <StatCard
          value={`${analytics.avgMatchScore}%`}
          label="Avg. Match Score"
          delta={analytics.deltas.matchScore}
        />
        <StatCard
          value={
            analytics.avgTimeToReview === null
              ? "-"
              : `${analytics.avgTimeToReview}d`
          }
          label="Time to Review"
          delta={analytics.deltas.timeToReview}
          invertDelta
        />
        <StatCard
          value={`${analytics.offerRate}%`}
          label="Offer Rate"
          delta={analytics.deltas.offerRate}
        />
      </div>

      <div className="av-main-grid">
        <div className="ed-card">
          <div className="av-panel-header">
            <span className="ed-card__title">Applications Over Time</span>
          </div>
          <ApplicationsChart data={analytics.applicationsOverTime} />
        </div>

        <BeeBreakdownPanel
          totalPooled={beeStats.totalPooled}
          breakdown={beeStats.breakdown}
        />
      </div>

      <div className="ed-card">
        <div className="av-panel-header">
          <span className="ed-card__title">Match Score Distribution</span>
          <span className="av-panel-sub">
            Colour bands follow PRD scoring tiers
          </span>
        </div>
        <ScoreDistribution data={analytics.scoreDistribution} />
      </div>
    </div>
  );
}
