# ScamRadar for Interns — Engineering Walkthrough

This document chronicles the engineering decisions, feature additions, and validation discoveries made during the core development phases of **ScamRadar for Interns**.

## 🚀 What Was Built

The application was significantly upgraded to deliver a robust, privacy-first detection experience:

1. **Company Verification Layer**: A new asynchronous analysis step that extracts company names and runs cross-checks:
   - **Domain Mismatch**: Checks if any extracted email addresses match the inferred company name.
   - **Web Presence**: Calls the DuckDuckGo Instant Answer API as a stateless check to verify if the company legitimately exists online.
2. **Developer Test Suite**: A dedicated test route (`/test`) to validate the scanner against 15 predefined, real-world test cases (Genuine, Suspicious, Likely Fake) to prevent regressions.
3. **OCR Upload Capability**: Integrated `Tesseract.js` to allow users to upload screenshots of WhatsApp forwards. The app automatically extracts the text and analyzes it seamlessly.

---

## 🔍 The Overfitting Discovery (Holdout Testing)

During rigorous manual testing and test-suite validation, we encountered a classic machine-learning problem within our rule-based engine: **overfitting**.

By adjusting weights and thresholds to perfectly achieve a 0% False Positive rate on our initial 30-message validation set, the engine became brittle to natural language variations. 

We ran a true holdout test against 10 completely unseen messages (5 new scams, 5 new genuine messages). The results were eye-opening:
- **False Positive Rate**: `0%` (Genuine messages remained safely unflagged).
- **Hit Rate**: `40%` (Missed 3 out of 5 novel scams).

> [!WARNING]
> The misses occurred because the new scams used synonyms (e.g., "purchase" instead of "pay", "slots" instead of "seats") that smoothly bypassed our strict regex rules.

---

## 🏗️ Architectural Pivot: The Hybrid Approach

Instead of attempting to patch infinite regex permutations, we made the architectural decision to **ship the rule-based engine as a fast, primary known-pattern detector**, while augmenting it with an LLM fallback for ambiguous cases.

We updated the UI to reflect this reality honestly:
1. **Removed False Reassurance**: The label for passing messages was changed from `"Likely Genuine"` to `"No Red Flags Found"`.
2. **Clear UI Disclaimer**: Added a permanent warning directly underneath the verdict card advising independent verification.

### The LLM Second-Opinion Layer

To solve the brittleness issue identified in our holdout testing, we implemented an **AI Second Opinion Layer**. This is built as a highly resilient **Vercel Serverless Function** (`api/llm-check.js`) using Groq's `openai/gpt-oss-20b` model, which successfully caught 100% of the holdout scams in testing.

**Key Architecture Details:**
- **Zero-Latency Primary Check**: The rule-based engine remains the fast, primary check. The LLM is strictly used as a fallback for ambiguous cases (`Suspicious` or `No Red Flags Found`). If a message is a blatant scam with upfront payment requests, the LLM is bypassed entirely to save costs and protect privacy.
- **Round-Robin Key Rotation**: The serverless function reads 4 separate API keys and automatically rotates them if a `429 Too Many Requests` or `401 Unauthorized` is hit, protecting free-tier rate limits.
- **Graceful Degradation**: If all keys are exhausted or Groq experiences an outage, the API falls back gracefully within 5 seconds without crashing the frontend.
- **Transparent Dual-Verdict UI**: When the LLM runs and returns a conflicting opinion, the UI cleanly displays both the rule-based verdict and the AI's reasoning, ensuring the user gets maximum context without false reassurance.
