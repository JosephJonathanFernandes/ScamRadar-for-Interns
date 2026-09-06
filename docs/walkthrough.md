# ScamRadar for Interns — Engineering Walkthrough & Audit Log

This document chronicles the engineering decisions, audit discoveries, architectural pivots, and validation milestones in the development of **ScamRadar for Interns**.

---

## Phase 1: Foundation & The Rule-Based Baseline

### 1. What Was Initially Built
- **Core Scanner (`src/core/scanner.js`)**: 9 weighted regex rules detecting payment requests, personal emails, artificial urgency, unverified direct hiring, vague roles, unrealistic stipends, sensitive personal data requests, link shorteners, and fake social proof.
- **Company Verification Layer (`src/core/companyCheck.js`)**: Asynchronous verification checking company domain similarity and querying DuckDuckGo's Instant Answer API.
- **Client-Side OCR (`src/core/ocr.js`)**: Integrated `Tesseract.js` with canvas greyscale/contrast preprocessing and automated regex stripping of WhatsApp timestamps, phone numbers, and forward headers.
- **Developer Test Suite (`src/components/TestSuitePage.jsx`)**: In-app interactive test benchmark page.

---

## Phase 2: The Overfitting Discovery & "Thesaurus Bypass"

### The Audit
We subjected the rule engine to an adversarial audit using novel holdout messages (unseen scams and genuine offers):
- **False Positive Rate**: `0%` (Genuine messages passed safely).
- **Hit Rate**: `40%` (Missed 3 out of 5 novel scams).

### Root Cause Analysis
The rule engine proved brittle to natural language synonyms:
- Swapping *"registration fee"* for *"nominal onboarding contribution"* scored 0 points.
- Replacing *"interview"* with *"orientation session"* bypassed direct selection rules.

Attempting to patch infinite regex permutations would have caused endless bloat and false alarms.

---

## Phase 3: The Hybrid Architecture Pivot

### Architectural Decision
Rather than relying solely on regex, we transitioned to a **hybrid two-tiered architecture**:
1. **Local Gatekeeper**: Fast, zero-cost client scanner immediately catches blatant scams ($\ge 7$ points or explicit fee requests).
2. **AI Semantic Analysis**: Ambiguous or clean messages are routed to a Vercel Serverless Function querying an open-source LLM via Groq.
3. **UI Transparency**: Passing messages were relabeled from `"Likely Genuine"` to `"No Red Flags Found"` with permanent disclaimers to prevent false reassurance.

---

## Phase 4: Adversarial Audit & The "Whack-A-Mole" Prompt Discovery

### The High-Stipend MNC Problem
During testing of legitimate offers, the LLM flagged a genuine **Google India SWE Internship** (stipend: ₹1,10,000/month) as suspicious because ₹1.1 Lakh exceeded standard fresher pay.

### The "Whack-A-Mole" Finding
When we added a hardcoded few-shot anchor specifically for Google's ₹1.1L stipend into the system prompt:
- It successfully cleared Google offers.
- **However**, it caused a regression on a remote content writing gig (`gen_wfh_content`), flagging it because of a 2-day deadline.

> **Engineering Finding**: Single-anchor static prompt tuning trades one failure for another rather than truly generalizing. This demonstrated the urgent need for a dynamic retrieval system rather than static prompt engineering.

---

## Phase 5: Addressing User Feedback (Noah's Bug Reports)

Noah tested the application across multiple messages and reported two major bugs:
1. *"The percentage is hardcoded... I'm getting 16% repeated across different messages."*
2. *"The API keys are not working... In the file there are 5 keys, but in the env there are only 2."*

### Investigation & Root Causes

#### 1. Why the 16% Score Repeated:
- In `scanner.js`, $\text{percentage} = \text{round}\left(\frac{\text{totalScore}}{25} \times 100\right)$.
- Any message triggering 4 rule points (e.g. `urgency_pressure` [2] + `vague_role` [2] = 4) produces mathematically:
  $$\frac{4}{25} \times 100 = 16\%$$
- More critically, in `App.jsx`, the LLM output was only shown in a secondary text box. When the AI returned *"Suspicious: it could be a scam"*, the main progress bar remained frozen at **16% Low Risk (green)**, creating an obvious contradiction.

#### 2. Why API Keys Failed:
- `llm-check.js` hardcoded `[GROQ_API_KEY_1, ... GROQ_API_KEY_5]`. Noah only had 2 keys in `.env`.
- Vite dev server middleware did not inject `.env` into `process.env` in Node.
- The fetch call had a 5-second timeout. On timeout or transient 5xx error, the retry loop immediately aborted without attempting Key 2.

---

## Phase 6: Implementation of RAG & Unified Score Calibration

To address the prompt overfitting and resolve Noah's bugs, we implemented three structural changes:

### 1. In-Memory RAG Architecture (`src/core/rag/`)
- **Corpus (`corpus.json`)**: Compiled 41 verified case precedents (21 scams, 20 genuine offers) with category tags and ground truth explanations.
- **Retriever (`retriever.js`)**: In-memory BM25 term weighting ($k1=1.5, b=0.75$) with semantic feature boosting for upfront fees, Aadhaar/PAN harvesting, MNC stipend brackets, and WhatsApp/Telegram channels.
- **Dynamic Context**: Injects the top 3 relevant precedents into the LLM prompt, grounding model inference in verified precedent rather than static anchors.

### 2. Fault-Tolerant Key Rotation (`src/api/llm-check.js`)
- Replaced hardcoded array with regex dynamic key discovery (`GROQ_API_KEY*` / `GROQ_KEY*`), supporting 1, 2, 4, or any number of keys.
- Added `loadEnv` support in `vite.config.js` to ensure `.env` is loaded during local dev.
- Extended request timeout to 12s and updated rotation loop so timeouts and server errors rotate to the next key.

### 3. Unified Score Calibrator (`src/core/scoreCalibrator.js`)
- Synchronized rule engine flags, RAG similarity, and LLM verdicts:
  - *LLM Fake* $\to$ `Likely Fake` with $\ge 80\% - 95\%$ risk.
  - *LLM Suspicious* $\to$ `Suspicious` with $52\% - 65\%$ risk.
  - *LLM Genuine* $\to$ `No Red Flags Found` with $\le 16\%$ risk.
  - *Safety Override* $\to$ Upfront payment requests strictly retain `Likely Fake`.
- Completely eliminated the repeating 16% bug.

---

## Phase 7: Student-Centric Experience Enhancements

Putting ourselves in the shoes of an anxious college student facing potential fraud:

1. **Actionable Next-Steps Guide (`ResultCard.jsx`)**:
   - Added immediate, plain-English instructions tailored to the verdict (e.g., *Never pay upfront fees*, *Do not share Aadhaar/PAN on WhatsApp*, *Insist on official `@company.com` email*).
2. **One-Click WhatsApp Alert Button**:
   - Added a **"📲 Copy Summary for WhatsApp Group"** button so students can copy a formatted warning to protect their college classmates with one tap.

---

## Phase 8: Comprehensive Verification Results

### 1. Vitest Automated Unit Test Suite (20/20 Passed)
- `tests/unit/retriever.test.js`: 5 tests passing.
- `tests/unit/keys.test.js`: 7 tests passing (including 4-key sequential rotation test).
- `tests/unit/calibrator.test.js`: 4 tests passing.
- `tests/unit/scanner.test.js`: 4 tests passing (100% validation dataset hit rate).

### 2. Student 15-Case Edge-Case Suite (`scripts/test_student_edge_cases.js`)
Evaluated across 15 real-world scenarios:
- High-Stipend Google MNC (₹1.1L/mo): **4% (Genuine)** ✅
- Google Spoofed with ₹1,500 courier fee: **92% (Fake)** ✅
- TechEra Aadhaar/PAN/IFSC harvesting: **80% (Fake)** ✅
- Telegram Like-and-Earn Task scam: **92% (Fake)** ✅
- BuildSpace casual founder DM: **4% (Genuine)** ✅
- TPO ALL-CAPS placement forward: **4% (Genuine)** ✅
- TCS Partner ₹2,500 training kit fee: **92% (Fake)** ✅
- Wipro ₹1,500 laptop security deposit: **92% (Fake)** ✅
- Seed startup unpaid learning role: **4% (Genuine)** ✅
- Obfuscated `bit.ly` vacation job: **65% (Suspicious)** ✅
- GeeksforGeeks Campus Ambassador: **4% (Genuine)** ✅
- NITI Aayog Gmail impersonation: **65% (Suspicious)** ✅
- Low-signal freshers DM: **55% (Suspicious)** ✅
- Multi-line promotion with ₹999 LMS fee: **92% (Fake)** ✅
- Razorpay formal offer letter with NDA: **4% (Genuine)** ✅

**Result**: **15/15 cases perfectly aligned with student safety expectations.**

---

## Summary
By evolving from rigid regex rules $\to$ hybrid LLM $\to$ in-memory RAG with unified score calibration and student-first action guides, ScamRadar delivers an honest, resilient, and protective tool for students navigating today's internship landscape.
