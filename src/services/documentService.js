//HANDLED CV + academic transcript upload (PDF/DOCX), client-side text
// extraction, and triggering the `extract-skills` Edge Function.

import { supabase } from "../config/supabase";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

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
 * extract plain text from a PDF or DOCX File object
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file) {
  if (!file) {
    throw new Error("No file provided to extract text from.");
  }

  try {
    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(" ") + "\n";
      }
      const trimmed = text.trim();
      if (!trimmed) {
        throw new Error(
          "This PDF has no extractable text (it may be a scanned image). Try a text-based PDF or a DOCX instead.",
        );
      }
      return trimmed;
    }

    // DOCX
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error("This DOCX file appears to be empty.");
    }
    return trimmed;
  } catch (err) {
    throw new Error(`Could not read "${file.name}": ${err.message}`);
  }
}

/**
 * uppload a document (CV or transcript) to the appropriate private bucket and
 * record it on student_profiles. returns the extracted text too, so the
 * caller dont't need to re-parse the file for the AI extraction step.
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

    // buckets are private, so we store the path and generate signed URLs on demand rather than a public URL.
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
 *
 * @param {'cv' | 'transcript'} docType
 * @param {string} storagePath - the value stored in cv_url / transcript_url
 */
export async function getDocumentSignedUrl(docType, storagePath) {
  const bucket = docType === "cv" ? "cvs" : "transcripts";
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 10); // 10 mina

  if (error) return { success: false, error: error.message };
  return { success: true, url: data.signedUrl };
}

/**
 * trigger the extract-skills Edge Function with the CV/transcript text
 * already extracted client-side.... UPDATES student_profiles server-side.
 *
 * @param {string} studentId
 * @param {string} cvText
 * @param {string} transcriptText
 */
export async function triggerSkillExtraction(
  studentId,
  cvText,
  transcriptText,
) {
  try {
    const { data, error } = await supabase.functions.invoke("extract-skills", {
      body: { studentId, cvText, transcriptText },
    });

    if (error) throw error;
    if (!data?.success)
      throw new Error(data?.error || "Skill extraction failed");

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * ffetch the full student_profiles row for the profile page.
 */
export async function getStudentProfile(userId) {
  try {
    const { data, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return { success: true, profile: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

const EXT_MIME_MAP = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function blobToFileLike(blob, storagePath) {
  const fileName = storagePath.split("/").pop();
  const ext = fileName.split(".").pop().toLowerCase();
  return new File([blob], fileName, { type: EXT_MIME_MAP[ext] || blob.type });
}

/**
 * -download again and re-extract text from whatever CV/transcript are already
 * stored for this user (no re-upload needed) - used by the "Run AI Analysis" btn
 * button on the profile page when the person hasn't picked new files.
 */
export async function extractTextFromStoredDocument(docType, storagePath) {
  if (!storagePath) {
    return {
      success: false,
      error: `No ${docType} on file yet - upload one first.`,
    };
  }

  // Compatibility shim: if this profile still has a full public URL saved
  // from the old cvService.js flow
  // storagePath will look like a URL rather than "userId/filename.ext".
  // storage.download() needs just the bucket-relative path.
  let cleanPath = storagePath;
  if (storagePath.startsWith("http")) {
    const marker = "/object/public/";
    const signMarker = "/object/sign/";
    const idx =
      storagePath.indexOf(marker) >= 0
        ? storagePath.indexOf(marker) + marker.length
        : storagePath.indexOf(signMarker) + signMarker.length;
    if (idx > 0) {
      // strip "<bucket-name>/" prefix that follows, then any query string
      const afterBucket = storagePath.slice(idx).split("/").slice(1).join("/");
      cleanPath = decodeURIComponent(afterBucket.split("?")[0]);
    } else {
      return {
        success: false,
        error: `Your stored ${docType} is from an old upload flow and can't be re-downloaded automatically. Please re-upload it.`,
      };
    }
  }

  try {
    const bucket = docType === "cv" ? "cvs" : "transcripts";
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(cleanPath);
    if (error) {
      throw new Error(
        `${error.message || "Download failed"} (bucket: "${bucket}", path: "${cleanPath}"). ` +
          `If this file was uploaded before the storage migration, please re-upload it.`,
      );
    }

    const file = blobToFileLike(data, cleanPath);
    const text = await extractTextFromFile(file);
    return { success: true, text };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateStudentProfile(userId, profileData) {
  try {
    const updates = {
      university: profileData.university,
      degree_program: profileData.qualification,
      graduation_year: profileData.graduationYear,
      location: profileData.location,
      phone: profileData.phone,
      linkedin_url: profileData.linkedinUrl || null,
      github_url: profileData.githubUrl || null,
      portfolio_url: profileData.portfolioUrl || null,
      profile_completed: true,
    };

    if ("raceCategory" in profileData) {
      updates.race_category = profileData.raceCategory;
    }
    if ("beeDisclosureConsentedAt" in profileData) {
      updates.bee_disclosure_consented_at =
        profileData.beeDisclosureConsentedAt;
    }

    const { error } = await supabase
      .from("student_profiles")
      .update(updates)
      .eq("id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
