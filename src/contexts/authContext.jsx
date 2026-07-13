// this basically stores current user info check if someone logged in and who are they?)

//  context provides authentication state and user profile information to the entire app...
// it listens for authentication state changes and updates the user and userProfile state accordingly.
//  thee getSession function checks for an active session on initial load, and the onAuthStateChange listener ensures that any changes in authentication status are reflected in the context.
//  useAuth hook allows components to easily access the authentication state and user profile information.

import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../config/supabase";
import { getUserProfile } from "../services/authService";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("da useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    // onAuthStateChange fires once immediately with the current session
    // (event "INITIAL_SESSION") and then again on every future sign-in/out,
    // so a single subscription covers both the first load and later changes.
    // We used to also call supabase.auth.getSession() separately here, which
    // fired a second, redundant getUserProfile() request on every page load/
    // refresh and could race with this listener - removed to cut load time.
    let cancelled = false;

    // Safety net: if this never fires (e.g. a stuck token refresh - this can
    // happen when testing the student and employer flows in two tabs of the
    // SAME browser, since Supabase stores the session in localStorage keyed
    // per-origin and broadcasts auth changes across tabs, so one tab signing
    // in/out can leave another tab's in-flight session check hanging), stop
    // showing a blank screen after a few seconds instead of hanging forever.
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn(
          "[auth] onAuthStateChange did not resolve within 8s - forcing loading to finish. " +
            "If you're testing student + employer accounts in two tabs of the same browser, " +
            "that's the likely cause (shared localStorage session) - use a separate browser " +
            "profile or an incognito window for the second role instead.",
        );
        setAuthTimedOut(true);
        setLoading(false);
      }
    }, 8000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          setUser(session.user);

          const result = await getUserProfile(session.user.id);
          if (!cancelled && result.success) {
            setUserProfile(result.profile);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (err) {
        // Make sure a thrown error here can never leave the app stuck on a
        // blank screen with no clue why.
        console.error("[auth] onAuthStateChange handler threw:", err);
      } finally {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userProfile,
    loading,
  };

  if (loading) {
    // Was previously `null`, which is indistinguishable from a crash if
    // something hangs - a visible state makes "still loading" vs "actually
    // broken" obvious at a glance.
    return <div style={{ padding: 24, fontFamily: "sans-serif", color: "#64748b" }}>Loading HireMe...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {authTimedOut && (
        <div style={{ background: "#fef2f2", color: "#991b1b", padding: "8px 16px", fontSize: 13, textAlign: "center" }}>
          Sign-in check timed out. If you have another HireMe tab open with a different account,
          try closing it or use a separate browser profile — refresh to try again.
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};
