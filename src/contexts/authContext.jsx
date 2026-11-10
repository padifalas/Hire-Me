// this basically stores current user info check if someone logged in and who are they?)

//  context provides authentication state and user profile information to the entire app...
// it listens for authentication state changes and updates the user and userProfile state accordingly.
//  thee getSession function checks for an active session on initial load, and the onAuthStateChange listener ensures that any changes in authentication status are reflected in the context.
//  useAuth hook allows components to easily access the authentication state and user profile information.

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { supabase } from "../config/supabase";
import { getUserProfile } from "../services/authService";
import SplashScreen from "../components/layout/SplashScreen.jsx";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileForId, setProfileForId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [splashGone, setSplashGone] = useState(false);

  const handleSplashDone = useCallback(() => setSplashGone(true), []);

  // 1. Session tracking: synchronous callback, no awaits on Supabase calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.warn("[auth] onAuthStateChange did not resolve within 30s");
      setAuthTimedOut(true);
      setAuthLoading(false);
    }, 30000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUserProfile(null);
        setProfileForId(null);
      }
      clearTimeout(timeoutId);
      setAuthLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // 2. Profile loading: runs after the user is known, outside the auth lock
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    getUserProfile(userId)
      .then((result) => {
        if (!cancelled && result.success) setUserProfile(result.profile);
      })
      .catch((err) => console.error("[auth] profile fetch failed:", err))
      .finally(() => {
        if (!cancelled) setProfileForId(userId);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refreshUserProfile = useCallback(async () => {
    if (!userId) return;
    const result = await getUserProfile(userId);
    if (result.success) setUserProfile(result.profile);
  }, [userId]);

  const loading = authLoading || (!!userId && profileForId !== userId);

  const value = { user, userProfile, loading, refreshUserProfile };

  return (
    <AuthContext.Provider value={value}>

{authTimedOut && (
  <div
    role="alert"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--spacing-md)",
      padding: "var(--spacing-md) var(--spacing-lg)",
      margin: "var(--spacing-md) var(--spacing-lg)",
      background: "var(--color-bg-card)",
      border: "1px solid var(--color-border)",
      borderLeft: "4px solid var(--color-status-rejected)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-sm)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--spacing-md)",
        minWidth: 0,
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-status-rejected)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0, marginTop: "2px" }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: '"Sora", "Manrope", sans-serif',
            fontSize: "var(--font-sm)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          Connection taking longer than expected
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: "var(--font-sm)",
            lineHeight: 1.5,
            color: "var(--color-text-secondary)",
          }}
        >
          We couldn't verify your sign-in session. Check your connection and
          try again.
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={() => window.location.reload()}
      style={{
        flexShrink: 0,
        padding: "9px 16px",
        background: "var(--color-text-primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-md)",
        fontFamily: '"Sora", "Manrope", sans-serif',
        fontSize: "var(--font-xs)",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-secondary-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--color-text-primary)";
      }}
    >
      Try again
    </button>
  </div>
)}
      {!loading && children}

      {!splashGone && (
        <SplashScreen ready={!loading} onDone={handleSplashDone} />
      )}
    </AuthContext.Provider>
  );
};
