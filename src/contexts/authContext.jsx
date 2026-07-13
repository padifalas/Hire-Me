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
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn(
          "[auth] onAuthStateChange did not resolve within 8s",
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
        //  error hereso app stuck on a
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

    return <div style={{ padding: 24, fontFamily: "'Manrope', sans-serif", color: "#64748b" }}>Loading HireMe...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {/* {authTimedOut && (
        <div style={{ background: "#fef2f2", color: "#991b1b", padding: "8px 16px", fontSize: 13, textAlign: "center" }}>
          Sign-in check timed out.  use a separate browser profile/icongito - refresh to try again.
        </div>
      )} */}
      {children}
    </AuthContext.Provider>
  );
};
