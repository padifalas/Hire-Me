import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Makes a modal behave like one: focus moves in, Tab is trapped, Escape closes,
 * page scroll locks, and focus returns to the trigger on close.
 * Attach the returned ref to the element with role="dialog".
 */
export default function useDialog({ onClose, closeDisabled = false }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeDisabledRef.current = closeDisabled;
  });

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      [...node.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0,
      );

    (focusables()[0] ?? node).focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (!closeDisabledRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return dialogRef;
}
