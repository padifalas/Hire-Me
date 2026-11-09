import { useState, useEffect, useRef } from "react";

export default function AutocompleteField({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  required,
  classPrefix = "pv", // matches the existing CSS class names
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listId = `${id}-listbox`;

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = (value || "").trim().toLowerCase();
  const matches = (
    query ? options.filter((o) => o.toLowerCase().includes(query)) : options
  ).slice(0, 6);
  const expanded = open && matches.length > 0;

  function select(option) {
    onChange({ target: { name, value: option } });
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      if (matches.length === 0) return;
      e.preventDefault();
      if (!expanded) {
        setOpen(true);
        setActiveIndex(0);
      } else {
        setActiveIndex((i) => (i + 1) % matches.length);
      }
    } else if (e.key === "ArrowUp") {
      if (!expanded) return;
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Enter" && expanded && activeIndex >= 0) {
      e.preventDefault();
      select(matches[activeIndex]);
    } else if (e.key === "Escape" && expanded) {
      e.stopPropagation();
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "Tab") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className={`${classPrefix}-autocomplete`} ref={wrapperRef}>
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={
          expanded && activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined
        }
      />

      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label={placeholder || name}
          className={`${classPrefix}-autocomplete__list`}
        >
          {matches.map((option, i) => (
            <li
              key={option}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                select(option);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {expanded
          ? `${matches.length} suggestion${matches.length === 1 ? "" : "s"} available`
          : ""}
      </span>
    </div>
  );
}
