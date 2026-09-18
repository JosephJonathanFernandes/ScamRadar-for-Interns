import React, { useEffect, useRef, useState } from "react";
import {
  ShieldCheckIcon,
  ShieldAlertIcon,
  ShieldXIcon,
  DatabaseIcon,
  InfoIcon,
  AlertTriangleIcon,
  CopyIcon,
  CheckIcon,
  ArrowLeftIcon,
} from "./icons.jsx";

const VERDICT_META = {
  "No Red Flags Found": {
    className: "verdict-genuine",
    statusLabel: "NO ADVERSE SIGNALS",
    tagline: "No structural fraud patterns or unauthorized payment demands detected.",
    Icon: ShieldCheckIcon,
    barColor: "var(--clr-genuine)",
    badgeClass: "badge-genuine",
  },
  Suspicious: {
    className: "verdict-suspicious",
    statusLabel: "ELEVATED RISK DETECTED",
    tagline: "Irregular recruitment channels, domain anomalies, or high-risk claims identified.",
    Icon: ShieldAlertIcon,
    barColor: "var(--clr-suspicious)",
    badgeClass: "badge-suspicious",
  },
  "Likely Fake": {
    className: "verdict-fake",
    statusLabel: "CRITICAL FRAUD PATTERN MATCH",
    tagline: "Strong indicators of advance-fee exploitation, deposit fraud, or credential harvesting.",
    Icon: ShieldXIcon,
    barColor: "var(--clr-fake)",
    badgeClass: "badge-fake",
  },
};

const SEVERITY_CONFIG = {
  5: { text: "CRITICAL", cls: "severity-critical" },
  4: { text: "HIGH", cls: "severity-high" },
  3: { text: "MEDIUM", cls: "severity-medium" },
  2: { text: "ELEVATED", cls: "severity-elevated" },
  1: { text: "ADVISORY", cls: "severity-advisory" },
};

export default function ResultCard({ result, llmResult, onReset }) {
  const { verdict, percentage, flags } = result;
  const meta = VERDICT_META[verdict] || VERDICT_META["No Red Flags Found"];
  const [barWidth, setBarWidth] = useState(0);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  const didLlmRun = llmResult !== null;

  const handleCopyWarning = () => {
    const flagList = flags.map((f) => `• [${f.label}] ${f.detail}`).join("\n");
    const summary = `SCAMRADAR SECURITY INCIDENT BRIEFING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assessment: ${verdict.toUpperCase()} (Threat Index: ${percentage}/100)
Status: ${meta.statusLabel}

${flags.length > 0 ? `Detected Threat Indicators:\n${flagList}\n` : "No structural threat vectors identified.\n"}
${llmResult?.reasoning ? `RAG Forensic Analysis:\n${llmResult.reasoning}\n` : ""}
Recommended Candidate Protocol:
${
  verdict === "Likely Fake"
    ? "1. Cease all communication and make NO payments (legitimate employers never charge deposits or equipment fees).\n2. Withhold government identification numbers (Aadhaar/PAN/Bank IFSC).\n3. Block sender across WhatsApp, Telegram, and email."
    : verdict === "Suspicious"
    ? "1. Verify the recruiter's credentials independently via the official corporate website.\n2. Require all official communications originate from verified corporate domain emails (@company.com).\n3. Do not open unverified shortlinks or complete external Google Forms."
    : "1. Standard protocol: Confirm the job opening on the company's verified career portal.\n2. Do not share financial onboarding credentials until a formal bilateral contract is executed."
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Analyzed by ScamRadar Threat Intelligence`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(percentage), 100);
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    return () => clearTimeout(t);
  }, [percentage]);

  const StatusIcon = meta.Icon;

  return (
    <div
      className={`result-card ${meta.className}`}
      ref={cardRef}
      role="region"
      aria-label="Threat Intelligence Report"
    >
      {/* ── Report Header & Verdict ── */}
      <div className="report-header">
        <div className="report-badge-row">
          <span className={`status-pill ${meta.badgeClass}`}>
            <StatusIcon size={14} />
            {meta.statusLabel}
          </span>
          <span className="report-id-pill">
            CASE ID: {Math.abs(percentage * 997 + flags.length).toString(16).toUpperCase().padStart(4, "0")}
          </span>
        </div>

        <div className="verdict-primary-row">
          <div className="verdict-icon-wrap">
            <StatusIcon size={32} />
          </div>
          <div>
            <h2 className="verdict-title">{verdict}</h2>
            <p className="verdict-tagline">{meta.tagline}</p>
          </div>
        </div>

        <p className="verdict-audit-note">
          {didLlmRun
            ? "Heuristic audit grounded against 41 verified case precedents in our reference corpus. Independent domain verification is advised before submitting candidate credentials."
            : "Direct pattern match confirmed by client-side regex heuristics. Immediate caution advised."}
        </p>
      </div>

      {/* ── Threat Index Meter ── */}
      <div className="threat-index-card">
        <div className="threat-index-header">
          <div>
            <span className="threat-label">THREAT INDEX</span>
            <p className="threat-desc">Estimated probability of fraudulent recruitment activity</p>
          </div>
          <div className="threat-score-wrap">
            <span className="threat-score-value">{percentage}</span>
            <span className="threat-score-denom">/ 100</span>
          </div>
        </div>

        <div
          className="score-track"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="score-fill"
            style={{
              width: `${barWidth}%`,
              backgroundColor: meta.barColor,
              transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>

        <div className="threat-scale-legend">
          <span className="legend-step legend-low">0–25 Low</span>
          <span className="legend-step legend-mod">26–60 Elevated</span>
          <span className="legend-step legend-high">61–85 High</span>
          <span className="legend-step legend-crit">86–100 Critical</span>
        </div>
      </div>

      {/* ── Knowledge Base Reference Grounding (RAG) ── */}
      {llmResult && llmResult.verdict !== "error" && (
        <div className="rag-reference-card">
          <div className="rag-card-header">
            <div className="rag-title-group">
              <DatabaseIcon size={16} className="rag-icon" />
              <h3 className="rag-heading">Knowledge Base Reference Grounding (RAG)</h3>
            </div>
            {result.isUnified && (
              <span className="rag-calibrated-tag">Calibrated Matrix</span>
            )}
          </div>

          <p className="rag-analysis-quote">
            "{llmResult.reasoning}"
          </p>

          {result.matchedPrecedent && (
            <div className="precedent-match-panel">
              <div className="precedent-match-header">
                <span className="precedent-pill">
                  Corpus Reference: <strong>{result.matchedPrecedent.category}</strong>
                </span>
                <span className="precedent-type-badge">
                  Ground Truth: {result.matchedPrecedent.type.toUpperCase()}
                </span>
              </div>
              <p className="precedent-desc-text">
                {result.matchedPrecedent.description}
              </p>
            </div>
          )}
        </div>
      )}

      {llmResult?.verdict === "error" && (
        <div className="rag-error-panel">
          <AlertTriangleIcon size={16} />
          <span>Secondary precedent verification service unavailable; assessment grounded in client-side rules.</span>
        </div>
      )}

      {/* ── Identified Threat Indicators ── */}
      <div className="indicators-section">
        <div className="indicators-header">
          <h3 className="indicators-title">
            Identified Threat Indicators ({flags.length})
          </h3>
          <span className="indicators-subtitle">
            Structural anomalies identified in candidate message
          </span>
        </div>

        {flags.length > 0 ? (
          <div className="indicators-grid">
            {flags.map((flag) => {
              const severity = SEVERITY_CONFIG[flag.weight] || SEVERITY_CONFIG[2];
              return (
                <div key={flag.id} className="indicator-card">
                  <div className="indicator-top-row">
                    <span className="indicator-label">{flag.label}</span>
                    <span className={`severity-tag ${severity.cls}`}>
                      {severity.text}
                    </span>
                  </div>
                  <p className="indicator-detail">{flag.detail}</p>
                  <div className="indicator-why-row">
                    <InfoIcon size={14} className="indicator-info-icon" />
                    <span className="indicator-why-text">{flag.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-indicators-card">
            <CheckIcon size={18} className="no-indicators-icon" />
            <div>
              <p className="no-indicators-title">No structural threat vectors detected</p>
              <p className="no-indicators-desc">
                The communication text does not contain upfront payment demands, known malicious shortlinks, or personal email address red flags.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Action Protocol (Student Guidance) ── */}
      <div className="protocol-section">
        <h4 className="protocol-title">
          {verdict === "Likely Fake"
            ? "Mandatory Incident Counter-Measures"
            : verdict === "Suspicious"
            ? "Required Verification Steps Before Responding"
            : "Standard Safe Practice for Candidates"}
        </h4>

        <div className="protocol-steps-grid">
          {verdict === "Likely Fake" ? (
            <>
              <div className="protocol-step-card">
                <span className="protocol-step-num">01</span>
                <div>
                  <strong>Withhold All Payments:</strong>
                  <p>Legitimate employers provide software and hardware without deposit requirements. Any UPI request is an immediate fraud indicator.</p>
                </div>
              </div>
              <div className="protocol-step-card">
                <span className="protocol-step-num">02</span>
                <div>
                  <strong>Restrict Identity Documents:</strong>
                  <p>Never provide Aadhaar scans, PAN numbers, or bank account IFSC details via WhatsApp before executing a formal appointment contract.</p>
                </div>
              </div>
              <div className="protocol-step-card">
                <span className="protocol-step-num">03</span>
                <div>
                  <strong>Cease Contact & Block:</strong>
                  <p>Disengage from the chat immediately. Scammers escalate pressure tactics and artificial deadlines when challenged.</p>
                </div>
              </div>
              <div className="protocol-step-card">
                <span className="protocol-step-num">04</span>
                <div>
                  <strong>Notify Classmates:</strong>
                  <p>Fraudulent operators broadcast identical messages across college groups. Share the incident briefing below to alert peers.</p>
                </div>
              </div>
            </>
          ) : verdict === "Suspicious" ? (
            <>
              <div className="protocol-step-card">
                <span className="protocol-step-num">01</span>
                <div>
                  <strong>Cross-Check Official Career Portals:</strong>
                  <p>Search the company's verified domain directly. Do not utilize application URLs provided within unsolicited forwarded messages.</p>
                </div>
              </div>
              <div className="protocol-step-card">
                <span className="protocol-step-num">02</span>
                <div>
                  <strong>Demand Verified Domain Routing:</strong>
                  <p>Request the recruiter follow up exclusively from their official corporate email address (e.g. name@company.com).</p>
                </div>
              </div>
              <div className="protocol-step-card">
                <span className="protocol-step-num">03</span>
                <div>
                  <strong>Inspect the Interview Protocol:</strong>
                  <p>Legitimate internships evaluate candidates through structured technical or conversational interviews, not text-only chats.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="protocol-step-card">
                <span className="protocol-step-num">01</span>
                <div>
                  <strong>Standard Resume Sharing is Safe:</strong>
                  <p>Sharing your portfolio, GitHub profile, or resume is standard and poses minimal risk at this stage.</p>
                </div>
              </div>
              <div className="protocol-step-card">
                <span className="protocol-step-num">02</span>
                <div>
                  <strong>Acknowledge Startup Outreach:</strong>
                  <p>Early-stage startups and college placement cells frequently utilize casual messaging channels for fast coordination.</p>
                </div>
              </div>
              <div className="protocol-step-card">
                <span className="protocol-step-num">03</span>
                <div>
                  <strong>Preserve Financial Privacy:</strong>
                  <p>Keep your bank account and PAN details private until an official appointment letter with corporate letterhead is provided.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Report Actions ── */}
      <div className="report-action-bar">
        <button className="btn-secondary-action" onClick={onReset}>
          <ArrowLeftIcon size={16} />
          Inspect Another Communication
        </button>
        <button
          className="btn-primary-action"
          onClick={handleCopyWarning}
          title="Copy formatted security briefing to clipboard"
        >
          {copied ? (
            <>
              <CheckIcon size={16} />
              Briefing Copied to Clipboard
            </>
          ) : (
            <>
              <CopyIcon size={16} />
              Copy Incident Briefing
            </>
          )}
        </button>
      </div>
    </div>
  );
}
