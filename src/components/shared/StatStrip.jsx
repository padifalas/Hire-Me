import "./StatStrip.css";

/* One continuous band of four figures. Each cell has its own tint and its
   own small visual, so the row reads as a different object from the cards
   and tables below it. Every visual is driven by real data passed in. */

const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;
const ARC_R = 30;
const ARC_LEN = Math.PI * ARC_R;

const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));

function Ring({ pct }) {
  return (
    <svg viewBox="0 0 56 56" className="hm-vis hm-vis--ring" aria-hidden="true">
      <circle cx="28" cy="28" r={RING_R} className="hm-ring__track" />
      <circle
        cx="28"
        cy="28"
        r={RING_R}
        className="hm-ring__fill"
        strokeDasharray={RING_C}
        strokeDashoffset={RING_C * (1 - clamp(pct) / 100)}
        transform="rotate(-90 28 28)"
      />
    </svg>
  );
}

function Arc({ pct }) {
  const d = `M ${34 - ARC_R} 36 A ${ARC_R} ${ARC_R} 0 0 1 ${34 + ARC_R} 36`;
  return (
    <svg viewBox="0 0 68 40" className="hm-vis hm-vis--arc" aria-hidden="true">
      <path d={d} className="hm-arc__track" />
      <path
        d={d}
        className="hm-arc__fill"
        strokeDasharray={ARC_LEN}
        strokeDashoffset={ARC_LEN * (1 - clamp(pct) / 100)}
      />
    </svg>
  );
}

function Bars({ series }) {
  const data = (series?.length ? series : [0]).slice(0, 8);
  const max = Math.max(...data, 1);
  return (
    <div className="hm-vis hm-vis--bars" aria-hidden="true">
      {data.map((v, i) => (
        <span key={i} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function Dots({ colors }) {
  const list = (colors ?? []).slice(0, 6);
  if (!list.length) return <div className="hm-vis hm-vis--dots hm-vis--empty" />;
  return (
    <div className="hm-vis hm-vis--dots" aria-hidden="true">
      {list.map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </div>
  );
}

function Lines({ count }) {
  const n = Math.min(Math.max(count, 1), 5);
  return (
    <div className="hm-vis hm-vis--lines" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ width: `${100 - i * 14}%` }} />
      ))}
    </div>
  );
}

function Pulse({ active }) {
  return (
    <div
      className={`hm-vis hm-vis--pulse${active ? " hm-vis--pulse-on" : ""}`}
      aria-hidden="true"
    >
      <span />
    </div>
  );
}

function Visual({ kind, visual }) {
  switch (kind) {
    case "ring":
      return <Ring pct={visual.pct} />;
    case "arc":
      return <Arc pct={visual.pct} />;
    case "bars":
      return <Bars series={visual.series} />;
    case "dots":
      return <Dots colors={visual.colors} />;
    case "lines":
      return <Lines count={visual.count} />;
    case "pulse":
      return <Pulse active={visual.active} />;
    default:
      return null;
  }
}

/* items: [{ tone: "sage"|"sand"|"clay"|"lilac", kind, visual, value, label, note }] */
export default function StatStrip({ items }) {
  return (
    <section className="hm-strip" aria-label="Key figures">
      {items.map((it) => (
        <div key={it.label} className={`hm-cell hm-cell--${it.tone}`}>
          <div className="hm-cell__label">{it.label}</div>
          <div className="hm-cell__value">{it.value}</div>
          {it.note && <div className="hm-cell__note">{it.note}</div>}
          <Visual kind={it.kind} visual={it.visual ?? {}} />
        </div>
      ))}
    </section>
  );
}
