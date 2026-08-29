/**
 * ocr.js
 * Core logic for preprocessing images and extracting text via OCR,
 * including stripping out WhatsApp UI artifacts.
 */

/**
 * Converts an image File to a greyscale, contrast-boosted PNG Blob using the
 * Canvas API.  This improves Tesseract accuracy on WhatsApp screenshot
 * backgrounds (coloured chat bubbles, dark mode, compressed JPEGs).
 *
 * @param {File} file - Source image file
 * @returns {Promise<Blob>} - Preprocessed PNG blob ready for Tesseract
 */
export async function preprocessImageForOCR(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const CONTRAST = 1.6; // contrast factor — 1.0 = unchanged

      for (let i = 0; i < data.length; i += 4) {
        // Luminance-weighted greyscale conversion
        const gray = Math.round(
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        );
        // Contrast boost: stretch around midpoint 128
        const boosted = Math.min(
          255,
          Math.max(0, Math.round((gray - 128) * CONTRAST + 128))
        );
        data[i] = boosted; // R
        data[i + 1] = boosted; // G
        data[i + 2] = boosted; // B
        // Alpha (data[i+3]) unchanged
      }

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob() failed"))),
        "image/png"
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image failed to load"));
    };
    img.src = objectUrl;
  });
}

/**
 * Patterns that identify WhatsApp UI chrome — these lines should NOT be
 * fed into the scam scanner because they risk false positives
 * (e.g. "Forwarded" triggering a capitalized company-name extraction).
 */
const WHATSAPP_ARTIFACT_PATTERNS = [
  // Timestamps: "12:34 PM", "08:45 AM"
  /^\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*$/,
  // Date + timestamp in various formats
  /^\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4},?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\s*$/i,
  // Square-bracket WhatsApp export format: "[08:45, 5/8/2024]"
  /^\s*\[\d{1,2}:\d{2},?\s+\d{1,2}\/\d{1,2}\/\d{4}\]\s*.*$/,
  // Day headers: "Yesterday", "Today", day names
  /^\s*(?:yesterday|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*$/i,
  // Month + day + year lines: "August 29, 2024"
  /^\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\s*$/i,
  // "Forwarded" / "Forwarded many times" / "⟳ Forwarded"
  /^\s*(?:⟳\s*)?forwarded(?:\s+many\s*times?)?\s*$/i,
  // "This message was forwarded many times"
  /^\s*this\s+message\s+was\s+forwarded/i,
  // WhatsApp encryption notice
  /^\s*messages?\s+(?:and\s+calls?\s+)?(?:are|is)\s+end[- ]to[- ]end\s+encrypted/i,
  // "~Name" display name lines
  /^\s*~[\w\s]+$/,
  // "Read" / "Delivered" / "Seen" status lines
  /^\s*(?:read|delivered|seen|sent)\s*$/i,
];

/**
 * Strips WhatsApp UI artifacts from raw OCR text.
 *
 * @param {string} rawText
 * @returns {{ cleanText: string, strippedLines: string[] }}
 */
export function stripWhatsAppArtifacts(rawText) {
  const lines = rawText.split("\n");
  const cleanLines = [];
  const strippedLines = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Keep blank lines in clean output (they preserve paragraph structure)
    if (!trimmed) {
      cleanLines.push("");
      continue;
    }

    const isArtifact = WHATSAPP_ARTIFACT_PATTERNS.some((p) => p.test(trimmed));
    if (isArtifact) {
      strippedLines.push(trimmed);
    } else {
      cleanLines.push(line);
    }
  }

  // Collapse 3+ consecutive blank lines down to 2
  const cleanText = cleanLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { cleanText, strippedLines };
}
