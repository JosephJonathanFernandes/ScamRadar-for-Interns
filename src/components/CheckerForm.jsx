import React, { useState, useRef, useCallback } from "react";
import { createWorker } from "tesseract.js";

const MAX_CHARS = 5000;

// ─── Canvas Preprocessing ────────────────────────────────────────────────────

/**
 * Converts an image File to a greyscale, contrast-boosted PNG Blob using the
 * Canvas API.  This improves Tesseract accuracy on WhatsApp screenshot
 * backgrounds (coloured chat bubbles, dark mode, compressed JPEGs).
 *
 * @param {File} file - Source image file
 * @returns {Promise<Blob>} - Preprocessed PNG blob ready for Tesseract
 */
async function preprocessImageForOCR(file) {
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
        data[i] = boosted;      // R
        data[i + 1] = boosted;  // G
        data[i + 2] = boosted;  // B
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

// ─── WhatsApp Artifact Stripping ─────────────────────────────────────────────

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
function stripWhatsAppArtifacts(rawText) {
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

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * ocrStatus state machine:
 *   null      — no image uploaded yet
 *   'loading' — Tesseract running
 *   'review'  — OCR done, showing extracted text for user review
 *   'error'   — OCR failed
 */
export default function CheckerForm({ onAnalyze }) {
  // Main textarea (direct paste path)
  const [text, setText] = useState("");

  // Image + OCR state
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrStatus, setOcrStatus] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrData, setOcrData] = useState(null);     // { cleanText, strippedLines }
  const [ocrEditText, setOcrEditText] = useState(""); // editable version of cleanText

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ── Handlers — direct text paste ──────────────────────────────────────────

  const handleTextChange = (e) => {
    setText(e.target.value.slice(0, MAX_CHARS));
  };

  const handleMainSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAnalyze(text);
  };

  // ── Handlers — image upload & OCR ─────────────────────────────────────────

  const processImage = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImagePreview(URL.createObjectURL(file));
    setOcrStatus("loading");
    setOcrProgress(0);
    setOcrData(null);
    setOcrEditText("");

    try {
      // Step 1: preprocess (greyscale + contrast)
      let sourceForOcr;
      try {
        sourceForOcr = await preprocessImageForOCR(file);
      } catch {
        // Fallback to original if canvas preprocessing fails
        sourceForOcr = file;
      }

      // Step 2: Tesseract OCR
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data } = await worker.recognize(sourceForOcr);
      await worker.terminate();

      // Step 3: strip WhatsApp artifacts
      const { cleanText, strippedLines } = stripWhatsAppArtifacts(data.text);
      setOcrData({ cleanText, strippedLines });
      setOcrEditText(cleanText);
      setOcrStatus("review");
    } catch (err) {
      console.error("OCR error:", err);
      setOcrStatus("error");
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);

  const handleClear = () => {
    setText("");
    setImagePreview(null);
    setOcrStatus(null);
    setOcrProgress(0);
    setOcrData(null);
    setOcrEditText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── OCR Review Actions ─────────────────────────────────────────────────────

  /** "Analyze this text →" — run onAnalyze directly with the reviewed OCR text */
  const handleOcrAnalyze = () => {
    if (!ocrEditText.trim()) return;
    onAnalyze(ocrEditText);
  };

  /** "Copy to text box" — moves text to main textarea for further editing */
  const handleOcrCopyToTextbox = () => {
    setText(ocrEditText.slice(0, MAX_CHARS));
    setOcrStatus("done"); // dismiss review panel
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const charCount = text.length;
  const isMainReady = text.trim().length > 0 && ocrStatus !== "loading";
  const isOcrReady = ocrEditText.trim().length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="checker-form-wrap">

      {/* ══ PRIMARY: Direct Text Paste ══════════════════════════════════════ */}
      <form onSubmit={handleMainSubmit} noValidate>
        <div className="form-section">
          <label htmlFor="message-input" className="form-label">
            Paste the internship message
          </label>
          <div className="textarea-wrapper">
            <textarea
              id="message-input"
              className="message-textarea"
              placeholder={`Paste the WhatsApp forwarded message here…\ne.g. 'Congratulations! You've been selected for a work-from-home internship at XYZ Corp. Registration fee: ₹500 (refundable). Reply within 2 hours.'`}
              value={text}
              onChange={handleTextChange}
              rows={8}
              aria-label="Internship message text"
              aria-describedby="char-count"
            />
            <div className="textarea-footer">
              <span
                id="char-count"
                className={charCount > MAX_CHARS * 0.9 ? "char-count warn" : "char-count"}
              >
                {charCount} / {MAX_CHARS}
              </span>
              {text && (
                <button
                  type="button"
                  className="btn-clear-text"
                  onClick={handleClear}
                  aria-label="Clear all input"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className={`btn-analyze ${isMainReady ? "btn-analyze--ready" : ""}`}
          disabled={!isMainReady}
          aria-disabled={!isMainReady}
          id="analyze-btn"
        >
          <span aria-hidden="true">🔍</span> Analyze Message
        </button>
      </form>

      {/* ── Divider ── */}
      <div className="divider-or" aria-hidden="true"><span>or</span></div>

      {/* ══ SECONDARY: Image Upload + OCR ══════════════════════════════════ */}
      <div className="form-section">
        <label className="form-label">Upload a screenshot</label>

        {/* Drop Zone */}
        <div
          className={`drop-zone ${isDragOver ? "drop-zone--active" : ""} ${imagePreview ? "drop-zone--has-image" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !imagePreview && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload screenshot of internship message"
          onKeyDown={(e) => e.key === "Enter" && !imagePreview && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
            id="image-upload"
            aria-label="Upload image file"
          />

          {!imagePreview ? (
            <div className="drop-zone-prompt">
              <div className="drop-icon" aria-hidden="true">📷</div>
              <p className="drop-text">Drop image here or <span className="drop-link">browse</span></p>
              <p className="drop-hint">PNG, JPG, WEBP · Enhanced greyscale preprocessing before OCR</p>
            </div>
          ) : (
            <div className="drop-zone-preview">
              <img src={imagePreview} alt="Uploaded screenshot preview" className="preview-img" />
              <div className="preview-overlay">
                {ocrStatus === "loading" && (
                  <div className="ocr-progress-wrap">
                    <div className="ocr-spinner" aria-hidden="true" />
                    <span>Preprocessing + reading text… {ocrProgress}%</span>
                    <div className="ocr-bar-track">
                      <div className="ocr-bar-fill" style={{ width: `${ocrProgress}%` }} />
                    </div>
                  </div>
                )}
                {ocrStatus === "review" && (
                  <div className="ocr-done">✅ Text extracted — review below before analyzing</div>
                )}
                {(ocrStatus === "done") && (
                  <div className="ocr-done">✅ Text copied to text box above</div>
                )}
                {ocrStatus === "error" && (
                  <div className="ocr-error">❌ Could not read text. Please paste manually.</div>
                )}
              </div>
              <button
                type="button"
                className="btn-remove-img"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ── OCR Review Panel (shown after successful OCR) ── */}
        {ocrStatus === "review" && ocrData && (
          <div className="ocr-review-panel" role="region" aria-label="OCR text review">
            <div className="ocr-review-header">
              <span className="ocr-review-icon" aria-hidden="true">✏️</span>
              <div>
                <p className="ocr-review-title">Review extracted text before analyzing</p>
                <p className="ocr-review-hint">
                  OCR on compressed screenshots is imperfect — correct any obvious errors
                  so the scanner reads the right content.
                </p>
              </div>
            </div>

            <textarea
              className="ocr-review-textarea"
              value={ocrEditText}
              onChange={(e) => setOcrEditText(e.target.value.slice(0, MAX_CHARS))}
              rows={8}
              aria-label="Extracted and editable OCR text"
              placeholder="Extracted text will appear here…"
              id="ocr-review-input"
            />

            {/* Stripped artifacts section */}
            {ocrData.strippedLines.length > 0 && (
              <details className="ocr-artifacts-details">
                <summary className="ocr-artifacts-summary">
                  🗑️ {ocrData.strippedLines.length} WhatsApp metadata line{ocrData.strippedLines.length > 1 ? "s" : ""} removed from analysis
                  <span className="artifacts-expand-hint"> (click to view)</span>
                </summary>
                <ul className="ocr-artifacts-list">
                  {ocrData.strippedLines.map((line, i) => (
                    <li key={i} className="ocr-artifact-line">
                      <span aria-hidden="true">🗑️</span> {line}
                    </li>
                  ))}
                </ul>
                <p className="ocr-artifacts-note">
                  These lines (timestamps, "Forwarded" labels, etc.) are excluded from scam detection to avoid noise.
                </p>
              </details>
            )}

            {/* Review action buttons */}
            <div className="ocr-review-actions">
              <button
                type="button"
                className={`btn-ocr-analyze ${isOcrReady ? "btn-ocr-analyze--ready" : ""}`}
                disabled={!isOcrReady}
                onClick={handleOcrAnalyze}
                id="ocr-analyze-btn"
              >
                <span aria-hidden="true">🔍</span> Looks good — Analyze this text
              </button>
              <button
                type="button"
                className="btn-ocr-edit"
                onClick={handleOcrCopyToTextbox}
              >
                📋 Copy to text box for editing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
