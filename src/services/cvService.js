// NOT USING ANYMOREEEEEE SCARED TO DLETE
import { supabase } from '../config/supabase';


/**
 * uploadd CV file to Supabase Storage
 * @param {File} file ... The CV filetype 4 (PDF or DOCX)
 * @param {string} userId - User's UUID
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadCV = async (file, userId) => {
  try {
    //to Validate kinda file
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PDF and DOCX files are allowed');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB - think thats we said rightf ??
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    // wil Create file path (cvs/userId/filename)
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/cv_${Date.now()}.${fileExt}`;

    //  Upload and take to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('cvs - HireMe Storage Bucket')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 4. get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('cvs - HireMe Storage Bucket')
      .getPublicUrl(fileName);

    // 5. update student profile with CV URL
    const { error: updateError } = await supabase
      .from('student_profiles')
      .update({
        cv_url: publicUrl,
        cv_file_name: file.name,
        cv_uploaded_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true, url: publicUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**all this is to get the CV URL for a student, which can be used to display or download the CV. It queries the student_profiles table for the cv_url and cv_file_name fields based on the user's ID. If successful, it returns the CV URL and file name; otherwise, it returns an error message.
 * get CV URL for a student
 * @param {string} userId
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const getCV = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('cv_url, cv_file_name')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return { success: true, url: data.cv_url, fileName: data.cv_file_name };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete CV
 * @param {string} userId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteCV = async (userId) => {
  try {
    // 1. get current CV file path
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('cv_url')
      .eq('id', userId)
      .single();

    if (profile && profile.cv_url) {
      // extracct file path from URL
      const fileName = `${userId}/${profile.cv_url.split('/').pop()}`;

      // 2. Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('cvs - HireMe Storage Bucket')
        .remove([fileName]);

      if (deleteError) throw deleteError;
    }

    // cclear CV fields in database
    const { error: updateError } = await supabase
      .from('student_profiles')
      .update({
        cv_url: null,
        cv_file_name: null,
        cv_uploaded_at: null
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
