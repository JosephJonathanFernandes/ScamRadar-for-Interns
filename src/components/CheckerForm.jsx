import React, { useState, useRef, useCallback } from "react";
import { createWorker } from "tesseract.js";
import { preprocessImageForOCR, stripWhatsAppArtifacts } from "../core/ocr.js";
import {
  SearchIcon,
  UploadIcon,
  EditIcon,
  TrashIcon,
  FileTextIcon,
  CheckIcon,
  AlertCircleIcon,
  XIcon,
} from "./icons.jsx";

const MAX_CHARS = 5000;

export default function CheckerForm({ onAnalyze }) {
  // Main textarea (direct paste path)
  const [text, setText] = useState("");

  // Image + OCR state
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrStatus, setOcrStatus] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrData, setOcrData] = useState(null); // { cleanText, strippedLines }
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
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

  const handleOcrAnalyze = () => {
    if (!ocrEditText.trim()) return;
    onAnalyze(ocrEditText);
  };

  const handleOcrCopyToTextbox = () => {
    setText(ocrEditText.slice(0, MAX_CHARS));
    setOcrStatus("done");
  };

  const charCount = text.length;
  const isMainReady = text.trim().length > 0 && ocrStatus !== "loading";
  const isOcrReady = ocrEditText.trim().length > 0;

  return (
    <div className="checker-form-wrap">
      {/* ══ PRIMARY: Direct Text Paste ══════════════════════════════════════ */}
      <form onSubmit={handleMainSubmit} noValidate>
        <div className="form-section">
          <div className="form-label-row">
            <label htmlFor="message-input" className="form-label">
              Offer Communication or Message Transcript
            </label>
            <span className="form-sublabel">Direct Text Inspection</span>
          </div>

          <div className="textarea-wrapper">
            <textarea
              id="message-input"
              className="message-textarea"
              placeholder={`Paste candidate message, email, or forwarded WhatsApp text here…\n\nExample: "Congratulations! You have been selected for the Data Analyst Internship at TechCorp. To confirm your laptop dispatch and onboarding kit, please transfer the refundable security deposit of ₹1,500 via UPI within 24 hours."`}
              value={text}
              onChange={handleTextChange}
              rows={8}
              aria-label="Internship message text"
              aria-describedby="char-count"
            />
            <div className="textarea-footer">
              <span
                id="char-count"
                className={
                  charCount > MAX_CHARS * 0.9 ? "char-count warn" : "char-count"
                }
              >
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
              </span>
              {text && (
                <button
                  type="button"
                  className="btn-clear-text"
                  onClick={handleClear}
                  aria-label="Clear all input"
                >
                  Clear Input
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
          <SearchIcon size={18} />
          <span>Execute Threat Scan</span>
        </button>
      </form>

      {/* ── Divider ── */}
      <div className="divider-or" aria-hidden="true">
        <span>OR UPLOAD SCREENSHOT</span>
      </div>

      {/* ══ SECONDARY: Image Upload + OCR ══════════════════════════════════ */}
      <div className="form-section">
        <div className="form-label-row">
          <label className="form-label">Screenshot Ingestion</label>
          <span className="form-sublabel">Client-Side OCR Processing</span>
        </div>

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
          onKeyDown={(e) =>
            e.key === "Enter" && !imagePreview && fileInputRef.current?.click()
          }
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
              <div className="drop-icon-wrap" aria-hidden="true">
                <UploadIcon size={24} />
              </div>
              <p className="drop-text">
                Drag and drop screenshot here, or <span className="drop-link">browse files</span>
              </p>
              <p className="drop-hint">
                PNG, JPG, WEBP supported · Processed 100% locally in browser memory
              </p>
            </div>
          ) : (
            <div className="drop-zone-preview">
              <img
                src={imagePreview}
                alt="Uploaded screenshot preview"
                className="preview-img"
              />
              <div className="preview-overlay">
                {ocrStatus === "loading" && (
                  <div className="ocr-progress-wrap">
                    <div className="ocr-spinner" aria-hidden="true" />
                    <span>Extracting transcript via Tesseract OCR… {ocrProgress}%</span>
                    <div className="ocr-bar-track">
                      <div
                        className="ocr-bar-fill"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {ocrStatus === "review" && (
                  <div className="ocr-done">
                    <CheckIcon size={16} />
                    <span>Text extracted successfully — review below before scan</span>
                  </div>
                )}
                {ocrStatus === "done" && (
                  <div className="ocr-done">
                    <CheckIcon size={16} />
                    <span>Text transferred to primary inspection console</span>
                  </div>
                )}
                {ocrStatus === "error" && (
                  <div className="ocr-error">
                    <AlertCircleIcon size={16} />
                    <span>Optical character recognition failed. Please paste text directly.</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-remove-img"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                aria-label="Remove image"
                title="Remove image"
              >
                <XIcon size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ── OCR Review Panel (shown after successful OCR) ── */}
        {ocrStatus === "review" && ocrData && (
          <div
            className="ocr-review-panel"
            role="region"
            aria-label="OCR text review"
          >
            <div className="ocr-review-header">
              <div className="ocr-review-icon-wrap" aria-hidden="true">
                <EditIcon size={18} />
              </div>
              <div>
                <p className="ocr-review-title">
                  Inspect Extracted Transcript
                </p>
                <p className="ocr-review-hint">
                  Review extracted characters to verify key details (amounts, domains, URLs) prior to scan execution.
                </p>
              </div>
            </div>

            <textarea
              className="ocr-review-textarea"
              value={ocrEditText}
              onChange={(e) =>
                setOcrEditText(e.target.value.slice(0, MAX_CHARS))
              }
              rows={8}
              aria-label="Extracted and editable OCR text"
              placeholder="Extracted text will appear here…"
              id="ocr-review-input"
            />

            {/* Stripped artifacts section */}
            {ocrData.strippedLines.length > 0 && (
              <details className="ocr-artifacts-details">
                <summary className="ocr-artifacts-summary">
                  <TrashIcon size={14} />
                  <span>
                    Filtered {ocrData.strippedLines.length} metadata line
                    {ocrData.strippedLines.length > 1 ? "s" : ""} (timestamps & headers)
                  </span>
                </summary>
                <ul className="ocr-artifacts-list">
                  {ocrData.strippedLines.map((line, i) => (
                    <li key={i} className="ocr-artifact-line">
                      <code>{line}</code>
                    </li>
                  ))}
                </ul>
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
                <SearchIcon size={16} />
                <span>Execute Scan with Extracted Text</span>
              </button>
              <button
                type="button"
                className="btn-ocr-edit"
                onClick={handleOcrCopyToTextbox}
              >
                <FileTextIcon size={16} />
                <span>Transfer to Main Editor</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
