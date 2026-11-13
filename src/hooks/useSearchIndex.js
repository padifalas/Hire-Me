import { useCallback, useRef, useState } from "react";

const STALE_MS = 60 * 1000;

/**
 * Loads the data behind the header search suggestions the first time the
 * search box is used (not on every dashboard load), then refreshes it at most
 * once a minute. If the load fails, page suggestions still work.
 *
 * @param {() => Promise<object|null>} loader  returns the new index, or null to keep the old one
 * @param {object} initial                      empty index shape
 */

export default function useSearchIndex(loader, initial) {
  const [index, setIndex] = useState(initial);
  const loadedAt = useRef(0);
  const inFlight = useRef(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const ensureLoaded = useCallback(async () => {
    if (inFlight.current || Date.now() - loadedAt.current < STALE_MS) return;
    inFlight.current = true;
    try {
      const next = await loaderRef.current();
      if (next) {
        setIndex(next);
        loadedAt.current = Date.now();
      }
    } catch (err) {
      console.error("[search] couldn't load suggestions:", err);
    } finally {
      inFlight.current = false;
    }
  }, []);

  return { index, ensureLoaded };
}
