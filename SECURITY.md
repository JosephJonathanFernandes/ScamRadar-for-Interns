# Security & Privacy Policy 🔒

ScamRadar for Interns is designed specifically for students who may be handling sensitive, forwarded recruitment messages. Protecting user privacy and securing the application pipeline are core architectural priorities.

---

## 1. Supported Versions

Only the latest commit on the `main` branch is actively maintained.

| Branch | Supported | Notes |
|---|---|---|
| `main` | ✅ Yes | Active development and production releases |
| `<others>` | ❌ No | Feature and experiment branches |

---

## 2. Privacy Commitments & Data Flow

Students frequently scan messages containing contact details or personal notes. ScamRadar adheres to a **zero-retention, privacy-first data model**:

```text
[ Screenshot Upload ] ──► In-Browser OCR (Tesseract.js) ──► Stays 100% on Device
                                │
[ Pasted Text Input ] ──────────┼──► WhatsApp Header Stripper (Removes phone #s, dates)
                                │
                                ▼
                   [ Client-Side Rule Scanner ]
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
       [ High-Confidence Scam ]         [ Ambiguous Message ]
                │                               │
        Handled 100% Locally            Sent to Vercel Serverless Function
        (Never touches network)         (Ephemeral, in-memory Groq call)
                                                │
                                                ▼
                                         Zero Database Writes
                                         Zero Logging of User Text
```

### Key Privacy Safeguards:
1. **Client-Side Image OCR**: Uploaded screenshots are processed directly within your browser using WebAssembly (`Tesseract.js`). Images are **never uploaded** to any server.
2. **Automated WhatsApp Metadata Stripping**: The OCR pipeline automatically removes WhatsApp export timestamps (e.g. `[10:45, 12/04/2024]`), phone numbers, and sender headers before text evaluation.
3. **Local Gatekeeper Bypass**: Blatant scams (such as explicit registration fee demands) are caught locally by the client-side rule engine and **never transmitted over the network**.
4. **Ephemeral Serverless Processing**: For ambiguous messages evaluated by Groq, requests are processed ephemerally in memory by the Vercel Serverless Function. No user text, analysis results, or IP addresses are permanently logged or stored in any database.
5. **No Analytics Tracking**: We do not use third-party user tracking scripts, advertising pixels, or telemetry collectors.

---

## 3. Reporting a Vulnerability

We welcome security audits and responsible disclosures from the community. If you discover a vulnerability or security issue:

1. **Do not disclose publicly**: Avoid opening public GitHub issues for sensitive security bugs.
2. **Email the Maintainer**: Send a report directly to `josephfernandes273@gmail.com` with:
   - Description of the issue.
   - Steps to reproduce or proof-of-concept payload.
   - Potential impact.
3. **Response Timeline**: You will receive an acknowledgment within 48 hours, and a patch or mitigation will be prioritized promptly.

---

## 4. API Key Security & Serverless Proxying

To prevent accidental key exposure:
- Groq API keys are stored strictly in server-side environment variables (`GROQ_KEY_1`, etc.) and are handled exclusively within the `/api/llm-check` serverless proxy.
- API keys are **never bundled into client-side JavaScript** or exposed to the browser.
- Rate-limiting rotation prevents quota denial-of-service on free-tier allocations.
