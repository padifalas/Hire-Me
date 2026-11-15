import { useState, useRef, useLayoutEffect, useId } from "react";
import { ChevronDown } from "lucide-react";

export default function JobDescription({ text, lines = 3 }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const paragraphRef = useRef(null);
  const paragraphId = useId();

  useLayoutEffect(() => {
    const el = paragraphRef.current;
    if (!el) return;

    function measure() {
      if (expanded) return;
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded, lines]);

  if (!text) return null;

  return (
    <div className="ov-desc">
      <p
        id={paragraphId}
        ref={paragraphRef}
        className={`ov-card__desc ${expanded ? "" : "ov-card__desc--clamped"}`}
        style={expanded ? undefined : { WebkitLineClamp: lines }}
      >
        {text}
      </p>

      {(overflowing || expanded) && (
        <button
          className="ov-desc__toggle"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls={paragraphId}
        >
          {expanded ? "Show Less" : "Read More"}
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={`ov-desc__chevron${expanded ? " ov-chevron--open" : ""}`}
          />
        </button>
      )}
    </div>
  );
}
