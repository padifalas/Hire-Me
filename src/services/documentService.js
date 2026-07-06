// src/services/documentService.js
//
// Handles CV + academic transcript upload (PDF/DOCX), client-side text
// extraction, and triggering the `extract-skills` Edge Function.
//
// Requires:
//   npm install pdfjs-dist mammoth
//
// pdfjs-dist needs its worker configured once — see setupPdfWorker() below,
// call it once from main.jsx.

import { supabase } from "../config/supabase";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Call once at app startup (e.g. in main.jsx) to point pdf.js at its worker.
 */
export function setupPdfWorker() {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only PDF and DOCX files are allowed");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File size must be less than 5MB");
  }
}

/**
 * Extract plain text from a PDF or DOCX File object, entirely client-side.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file) {
  if (file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return text.trim();
  }

  // DOCX
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value.trim();
}

/**
 * Upload a document (CV or transcript) to the appropriate private bucket and
 * record it on student_profiles. Returns the extracted text too, so the
 * caller doesn't need to re-parse the file for the AI extraction step.
 *
 * @param {File} file
 * @param {string} userId
 * @param {'cv' | 'transcript'} docType
 */
export async function uploadDocument(file, userId, docType) {
  try {
    validateFile(file);

    const bucket = docType === "cv" ? "cvs" : "transcripts";
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${docType}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { cacheControl: "3600", upsert: true });

    if (uploadError) throw uploadError;

    // Buckets are private, so we store the path and generate signed URLs on
    // demand rather than a public URL.
    const columnPrefix = docType === "cv" ? "cv" : "transcript";
    const { error: updateError } = await supabase
      .from("student_profiles")
      .update({
        [`${columnPrefix}_url`]: fileName,
        [`${columnPrefix}_file_name`]: file.name,
        [`${columnPrefix}_uploaded_at`]: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    const extractedText = await extractTextFromFile(file);

    return { success: true, path: fileName, extractedText };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get a temporary signed URL to view/download a stored document.
 * @param {'cv' | 'transcript'} docType
 * @param {string} storagePath - the value stored in cv_url / transcript_url
 */
export async function getDocumentSignedUrl(docType, storagePath) {
  const bucket = docType === "cv" ? "cvs" : "transcripts";
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 10); // 10 minutes

  if (error) return { success: false, error: error.message };
  return { success: true, url: data.signedUrl };
}

/**
 * Trigger the extract-skills Edge Function with the CV/transcript text
 * already extracted client-side. Updates student_profiles server-side.
 *
 * @param {string} studentId
 * @param {string} cvText
 * @param {string} transcriptText
 */
export async function triggerSkillExtraction(studentId, cvText, transcriptText) {
  try {
    const { data, error } = await supabase.functions.invoke("extract-skills", {
      body: { studentId, cvText, transcriptText },
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Skill extraction failed");

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update the non-document parts of the student's profile
 * (university, qualification, links, etc.)
 */
export async function updateStudentProfile(userId, profileData) {
  try {
    const { error } = await supabase
      .from("student_profiles")
      .update({
        university: profileData.university,
        degree_program: profileData.qualification,
        graduation_year: profileData.graduationYear,
        location: profileData.location,
        phone: profileData.phone,
        linkedin_url: profileData.linkedinUrl || null,
        github_url: profileData.githubUrl || null,
        portfolio_url: profileData.portfolioUrl || null,
        profile_completed: true,
      })
      .eq("id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
