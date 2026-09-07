//this is the Sign up, login, logout functions and also the get session and get user profile functions
import { supabase } from "../config/supabase";

/**
 * siign up with email and password
 * @param {string} email
 * @param {string} password
 * @param {object} userData - {fullName, role}
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const signUpWithEmail = async (email, password, userData) => {
  try {
    // this to Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData.fullName,
          role: userData.role,
        },
      },
    });

    if (authError) throw authError;

    // this one to Create user profile
    const { error: profileError } = await supabase.from("users").insert([
      {
        id: authData.user.id,
        email: authData.user.email,
        full_name: userData.fullName,
        role: userData.role,
      },
    ]);

    if (profileError) throw profileError;

    // alsoooo this one to Create role-specific profile
    if (userData.role === "student") {
      const { error: studentError } = await supabase
        .from("student_profiles")
        .insert([{ id: authData.user.id }]);

      if (studentError) throw studentError;
    } else if (userData.role === "employer") {
      const { error: employerError } = await supabase
        .from("employer_profiles")
        .insert([
          {
            id: authData.user.id,
            company_name: userData.companyName || "Company Name",
          },
        ]);

      if (employerError) throw employerError;
    }

    return { success: true, user: authData.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export const signInWithEmail = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Sign out current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get current session
 * @returns {Promise<{session: object | null}>}
 */
export const getSession = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

/**
 * Get user profile from database
 * @param {string} userId
 * @returns {Promise<{success: boolean, profile?: object, error?: string}>}
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;

    return { success: true, profile: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateUserProfile = async (userId, { fullName }) => {
  try {
    const { error } = await supabase
      .from("users")
      .update({ full_name: fullName })
      .eq("id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const uploadAvatar = async (file, userId) => {
  try {
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      throw new Error("Avatar must be a PNG, JPG, or a WEBP image");
    }
    if (file.size > MAX_AVATAR_SIZE) {
      throw new Error("Avatar must be under 2MB");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { cacheControl: "3600", upsert: true });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (updateError) throw updateError;

    return { success: true, url: publicUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
