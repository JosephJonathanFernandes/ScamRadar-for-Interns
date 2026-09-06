import React, { useEffect, useRef, useState } from "react";

const VERDICT_META = {
  "No Red Flags Found": {
    className: "verdict-genuine",
    emoji: "✅",
    tagline: "This message looks mostly clean.",
    barClass: "bar-genuine",
  },
  Suspicious: {
    className: "verdict-suspicious",
    emoji: "⚠️",
    tagline: "Proceed with caution — verify before engaging.",
    barClass: "bar-suspicious",
  },
  "Likely Fake": {
    className: "verdict-fake",
    emoji: "🚨",
    tagline: "Strong signs of a scam — do not engage or pay anything.",
    barClass: "bar-fake",
  },
};

const WEIGHT_LABEL = {
  5: { text: "Critical", cls: "weight-critical" },
  4: { text: "High", cls: "weight-high" },
  3: { text: "Medium", cls: "weight-medium" },
  2: { text: "Low", cls: "weight-low" },
  1: { text: "Minor", cls: "weight-minor" },
};

const LLM_VERDICT_MAP = {
  genuine: "Appears Genuine (Still verify independently)",
  suspicious: "Suspicious",
  fake: "Likely Fake",
};

export default function ResultCard({ result, llmResult, onReset }) {
  const { verdict, percentage, flags } = result;
  const meta = VERDICT_META[verdict];
  const [barWidth, setBarWidth] = useState(0);
  const cardRef = useRef(null);

  const didLlmRun = llmResult !== null;

  useEffect(() => {
    // Animate bar after mount
    const t = setTimeout(() => setBarWidth(percentage), 80);
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    return () => clearTimeout(t);
  }, [percentage]);

  return (
    <div
      className={`result-card ${meta.className}`}
      ref={cardRef}
      role="region"
      aria-label="Analysis Result"
    >
      {/* ── Verdict Badge ── */}
      <div className="verdict-header">
        <span className="verdict-emoji" aria-hidden="true">
          {meta.emoji}
        </span>
        <div className="verdict-text">
          <h2 className="verdict-title">{verdict}</h2>
          <p className="verdict-tagline">{meta.tagline}</p>
        </div>
      </div>

      <div className="verdict-disclaimer">
        {didLlmRun ? (
          <>
            ⚠️ This message was analyzed by an AI model calibrated against verified reference precedents.
            Avoid pasting messages containing sensitive personal information. A clean result
            doesn't guarantee the offer is genuine.
          </>
        ) : (
          <>
            ⚠️ This message was confidently flagged by known scam patterns. A clean result doesn't
            guarantee the offer is genuine — always verify the company
            independently.
          </>
        )}
      </div>

      {llmResult?.verdict === "error" && (
        <div className="llm-opinion-section llm-error">
          <p className="llm-reasoning" style={{ color: "#d97706" }}>
            ⚠️ AI second-opinion check unavailable right now — result based on pattern rules only.
          </p>
        </div>
      )}

      {llmResult && llmResult.verdict !== "error" && (
        <div className="llm-opinion-section">
          <div className="llm-opinion-header">
            <h3 className="llm-heading">
              🤖 AI & Precedent Analysis: {LLM_VERDICT_MAP[llmResult.verdict] || llmResult.verdict}
            </h3>
            {result.isUnified && (
              <span className="calibrated-badge">Calibrated</span>
            )}
          </div>
          <p className="llm-reasoning">{llmResult.reasoning}</p>

          {result.matchedPrecedent && (
            <div className="rag-precedent-box">
              <div className="rag-precedent-tag">
                📚 Verified Reference Precedent: <strong>{result.matchedPrecedent.category}</strong>
              </div>
              <p className="rag-precedent-desc">
                {result.matchedPrecedent.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Score Bar ── */}
      <div className="score-section">
        <div className="score-label-row">
          <span>Risk Level</span>
          <span className="score-pct">{percentage}%</span>
        </div>
        <div
          className="score-bar-track"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`score-bar-fill ${meta.barClass}`}
            style={{
              width: `${barWidth}%`,
              transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
        </div>
        <div className="score-scale">
          <span>Low Risk</span>
          <span>High Risk</span>
        </div>
      </div>

      {/* ── Flags Found ── */}
      {flags.length > 0 ? (
        <div className="flags-section">
          <h3 className="flags-heading">
            🚩 {flags.length} Red Flag{flags.length > 1 ? "s" : ""} Detected
          </h3>
          <ul className="flags-list">
            {flags.map((flag) => {
              const wl = WEIGHT_LABEL[flag.weight] || WEIGHT_LABEL[2];
              return (
                <li key={flag.id} className="flag-item">
                  <div className="flag-item-top">
                    <span className="flag-item-label">{flag.label}</span>
                    <span className={`flag-severity-badge ${wl.cls}`}>
                      {wl.text}
                    </span>
                  </div>
                  <p className="flag-item-detail">{flag.detail}</p>
                  <p className="flag-item-why">ℹ️ {flag.description}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="no-flags">
          <p>✅ No specific red flags were detected in this message.</p>
          <p className="no-flags-sub">
            Always verify independently — the checker is rule-based and cannot
            guarantee legitimacy.
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="result-actions">
        <button className="btn-reset" onClick={onReset}>
          ← Check Another Message
        </button>
      </div>
    </div>
  );
}
