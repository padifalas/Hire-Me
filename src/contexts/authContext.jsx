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

  useEffect(() => {
    // first check active session
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);

        // fetch user profile
        const result = await getUserProfile(session.user.id);
        if (result.success) {
          setUserProfile(result.profile);
        }
      }

      setLoading(false);
    };

    checkSession();

    // listen n check for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);

        const result = await getUserProfile(session.user.id);
        if (result.success) {
          setUserProfile(result.profile);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userProfile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
