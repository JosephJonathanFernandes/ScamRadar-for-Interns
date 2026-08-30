# ScamRadar for Interns 🕵️‍♀️💼

[![CI](https://github.com/yourusername/scamradar-for-interns/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/scamradar-for-interns/actions/workflows/ci.yml)

A powerful, hybrid scam detection tool designed specifically to protect students and freshers from fraudulent internship offers, fake recruitment drives, and data-entry scams.

## Problem Statement

Internship scams are increasingly sophisticated. While some scams are obvious (asking for an upfront "registration fee"), others rely on subtle psychological manipulation—using artificial urgency, spoofing legitimate company domains, and offering vague roles to harvest sensitive personal data (Aadhaar, PAN) or extract free labor.

ScamRadar for Interns solves this by analyzing the text of recruitment messages using a two-tiered architecture: a fast, offline rule engine for confirming obvious scams, and an AI-powered semantic check for everything else.

## The Hybrid Architecture

Our approach prioritizes speed, privacy, and cost-efficiency. By using a rule engine as the first line of defense, we avoid sending high-confidence scams to an LLM, reserving API quota for messages that need semantic analysis.

```text
[ Raw Message ] 
       │
       ▼
[ Core Rules Engine ] ────── (Fast, Local Regex/Keyword Scanning)
       │
       ├─► High Score? ───── [ Verdict: Likely Fake ] (No API cost)
       │
       └─► Low/Ambiguous? 
               │
               ▼
   [ Vercel Edge Proxy ] ─── (Round-robin API Key Rotation)
               │
               ▼
[ Groq API (gpt-oss-20b) ] ─ (Primary Semantic LLM Analysis)
               │
               ▼
      [ Final Verdict ]
```

### Why a Hybrid Approach?
During our testing phase, an adversarial audit revealed that the **rules-only engine is brittle to simple synonym swapping (the "Thesaurus Bypass")**. If a scam says "onboarding contribution" instead of "registration fee", it scores zero points. By integrating the LLM as the primary semantic check for any message that isn't already confidently flagged, our **hit rate increased to 100%** without sacrificing false-positive precision (0% FPR). Read more about our architecture in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech Stack

*   **Frontend**: React + Vite (Vanilla CSS)
*   **OCR Engine**: Tesseract.js (Client-side image processing)
*   **LLM API**: Groq (openai/gpt-oss-20b)
*   **Serverless**: Vercel Serverless Functions (`/api`)
*   **Testing**: Vitest (Unit tests and Validation datasets)

## Repository Structure

```
scamradar-for-interns/
├── src/
│   ├── App.jsx             # Main Application Logic
│   ├── components/         # React Components
│   ├── core/               # Core pure-function business logic
│   │   ├── scanner.js      # Red-flag rule engine
│   │   ├── companyCheck.js # Domain similarity & web presence checks
│   │   └── ocr.js          # Image preprocessing & WhatsApp artifact stripping
│   └── api/                # Serverless API routes
│       └── llm-check.js    # Edge function proxy for Groq LLM
├── tests/
│   ├── unit/               # Vitest unit test suites
│   └── fixtures/           # Holdout and validation datasets
├── scripts/                # Node scripts for evaluating hit-rate
├── docs/                   # Architecture and walkthrough documentation
├── public/                 # Static assets
└── vite.config.js          # Vite config & API proxying for local dev
```

## Setup & Development

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/scamradar-for-interns.git
    cd scamradar-for-interns
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Variables**
    Create a `.env.local` file in the root directory. You can provide up to 5 keys to utilize the round-robin key rotation built into the serverless function.
    ```env
    # .env.local
    GROQ_KEY_1=your_key_1_here
    GROQ_KEY_2=your_key_2_here
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```

5.  **Run Tests**
    Execute the unit tests and the validation dataset:
    ```bash
    npm test
    ```

## Validation & Testing

ScamRadar relies heavily on empirical validation. We maintain two datasets:
- **Validation Dataset (`tests/fixtures/validationData.js`)**: Real-world scams used to tune the rules engine (100% Hit Rate).
- **Holdout Dataset (`tests/fixtures/holdoutData.json`)**: Unseen scams used to verify the performance of the full hybrid pipeline.

To run the standalone evaluation scripts:
```bash
node scripts/run_validation.js
node scripts/run_holdout.js
```

## Security

Please read [SECURITY.md](SECURITY.md) for vulnerability reporting and privacy disclosures regarding the LLM API integration.