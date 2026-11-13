import { useState, useRef, useEffect, useId, useMemo } from "react";
import { Search, X } from "lucide-react";

import "./GlobalSearch.css";

/**
 * Header search box. Typing shows grouped suggestions, pages, jobs, people;
 * choosing one calls onSelect(item). The parent also receives every keystroke
 * through onChange, so the page underneath can filter itself with the same text.
 *
 * groups: [{ id, label, items: [{ key, label, hint?, Icon?, action }] }]
 */

export default function GlobalSearch({
  value,
  onChange,
  groups,
  onSelect,
  onActivate, // called when the box is focused, use it to lazy-load suggestion data
  placeholder = "Search...",
  ariaLabel = "Search",
  className = "",
  inputClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const uid = useId();
  const listId = `${uid}-list`;

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const expanded = open && value.trim() !== "" && flat.length > 0;

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

  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(`${uid}-opt-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, uid]);

  function choose(item) {
    if (!item) return;
    setOpen(false);
    setActiveIndex(-1);
    onSelect(item);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      if (flat.length === 0) return;
      e.preventDefault();
      if (!expanded) {
        setOpen(true);
        setActiveIndex(0);
      } else {
        setActiveIndex((i) => (i + 1) % flat.length);
      }
    } else if (e.key === "ArrowUp") {
      if (!expanded) return;
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (!expanded) return;
      e.preventDefault();
      choose(flat[activeIndex >= 0 ? activeIndex : 0]);
    } else if (e.key === "Escape") {
      if (expanded) {
        e.stopPropagation();
        setOpen(false);
        setActiveIndex(-1);
      } else if (value) {
        onChange("");
      }
    } else if (e.key === "Tab") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  let optionNumber = 0;

  return (
    <div
      className={`gs-root ${className}`.trim()}
      ref={wrapperRef}
      role="search"
    >
      <Search size={14} color="#64748b" aria-hidden="true" />

      <input
        ref={inputRef}
        className={inputClassName}
        type="text"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={
          expanded && activeIndex >= 0 ? `${uid}-opt-${activeIndex}` : undefined
        }
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          setOpen(true);
          onActivate?.();
        }}
        onKeyDown={handleKeyDown}
      />

      {value && (
        <button
          type="button"
          className="gs-clear"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            setOpen(false);
            setActiveIndex(-1);
            inputRef.current?.focus();
          }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}

      {expanded && (
        <ul
          id={listId}
          className="gs-menu"
          role="listbox"
          aria-label="Search suggestions"
        >
          {groups.map((g) => (
            <li key={g.id} role="presentation">
              <span className="gs-group__label" id={`${uid}-g-${g.id}`}>
                {g.label}
              </span>
              <ul role="group" aria-labelledby={`${uid}-g-${g.id}`}>
                {g.items.map((item) => {
                  const idx = optionNumber++;
                  const Icon = item.Icon;
                  return (
                    <li
                      key={item.key}
                      id={`${uid}-opt-${idx}`}
                      role="option"
                      aria-selected={idx === activeIndex}
                      className={`gs-option${idx === activeIndex ? " gs-option--active" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        choose(item);
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <span className="gs-option__icon" aria-hidden="true">
                        {Icon && <Icon size={14} />}
                      </span>
                      <span className="gs-option__text">
                        <span className="gs-option__label">{item.label}</span>
                        {item.hint && (
                          <span className="gs-option__hint">{item.hint}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {expanded
          ? `${flat.length} suggestion${flat.length === 1 ? "" : "s"} available`
          : ""}
      </span>
    </div>
  );
}
