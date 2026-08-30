import React, { useState } from "react";
import CheckerForm from "./components/CheckerForm";
import ResultCard from "./components/ResultCard";
import RedFlagsGuide from "./components/RedFlagsGuide";
import TestSuitePage from "./components/TestSuitePage";
import { analyzeMessage } from "./core/scanner.js";
import { checkCompany } from "./core/companyCheck.js";

export default function App() {
  const [result, setResult] = useState(null);
  const [llmResult, setLlmResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTestSuite, setShowTestSuite] = useState(false);

  /**
   * Async: runs company check (network, up to 2 s) then merges company flags
   * into the synchronous scanner verdict.
   */
  const handleAnalyze = async (text) => {
    setIsAnalyzing(true);
    setLlmResult(null); // Reset previous LLM result
    let analysis;
    try {
      const companyFlags = await checkCompany(text);
      analysis = analyzeMessage(text, companyFlags);
      setResult(analysis);
    } catch {
      // Should never reach here — checkCompany is already guarded internally,
      // but just in case, fall back to scanning without company flags.
      analysis = analyzeMessage(text, []);
      setResult(analysis);
    }

    // Call LLM as the primary semantic check for anything not confidently flagged
    if (analysis.verdict !== "Likely Fake") {
      try {
        const response = await fetch("/api/llm-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.llmAvailable && data.result) {
            setLlmResult(data.result);
          } else {
            setLlmResult({ verdict: "error" });
          }
        } else {
          setLlmResult({ verdict: "error" });
        }
      } catch (err) {
        console.warn("LLM check failed:", err);
        setLlmResult({ verdict: "error" });
      }
    }

    setIsAnalyzing(false);
  };

  const handleReset = () => {
    setResult(null);
    setLlmResult(null);
  };

  // ── Test Suite View ──────────────────────────────────────────────────────
  if (showTestSuite) {
    return (
      <div className="app-root">
        <header className="app-header">
          <div className="header-inner">
            <div className="logo-row">
              <span className="logo-shield" aria-hidden="true">
                🛡️
              </span>
              <div>
                <h1 className="app-title">ScamRadar for Interns</h1>
                <p className="app-tagline">
                  Is that internship offer real — or a scam?
                </p>
              </div>
            </div>
            <div className="header-badge">
              <span>🔒 100% Private — no data leaves your device</span>
            </div>
          </div>
        </header>
        <main className="app-main">
          <div className="content-container">
            <TestSuitePage onBack={() => setShowTestSuite(false)} />
          </div>
        </main>
        <footer className="app-footer">
          <p>
            ScamRadar for Interns is a free, open tool for students. Results are
            rule-based estimates — always verify independently.
          </p>
          <p className="footer-disclaimer">
            Privacy first. Ambiguous messages may be sent to an AI for secondary
            analysis, but no data is permanently stored or logged.
          </p>
        </footer>
      </div>
    );
  }

  // ── Main App View ────────────────────────────────────────────────────────
  return (
    <div className="app-root">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo-row">
            <span className="logo-shield" aria-hidden="true">
              🛡️
            </span>
            <div>
              <h1 className="app-title">ScamRadar for Interns</h1>
              <p className="app-tagline">
                Is that internship offer real — or a scam?
              </p>
            </div>
          </div>
          <div className="header-right">
            <button
              className="btn-test-suite"
              onClick={() => setShowTestSuite(true)}
              title="Open developer test suite"
              aria-label="Open test suite"
              id="open-test-suite-btn"
            >
              🧪 Test Suite
            </button>
            <div className="header-badge">
              <span>🔒 100% Private</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main">
        <div className="content-container">
          {/* ── Checker Card ── */}
          <div className="checker-card">
            {isAnalyzing ? (
              <div className="analyzing-state" role="status" aria-live="polite">
                <div className="analyzing-spinner" aria-hidden="true" />
                <p className="analyzing-label">
                  Verifying company information…
                </p>
                <p className="analyzing-sub">
                  Checking online presence · usually under 2 seconds
                </p>
              </div>
            ) : result ? (
              <ResultCard
                result={result}
                llmResult={llmResult}
                onReset={handleReset}
              />
            ) : (
              <>
                <div className="checker-intro">
                  <h2>Check an Internship Message</h2>
                  <p>
                    Got a message from an unknown company? Paste it below (or
                    upload a screenshot) and we'll scan it for common scam
                    patterns instantly.
                  </p>
                </div>
                <CheckerForm onAnalyze={handleAnalyze} />
              </>
            )}
          </div>

          {/* ── How It Works strip ── */}
          {!result && !isAnalyzing && (
            <div className="how-it-works">
              <h2>How it works</h2>
              <div className="steps-row">
                {[
                  {
                    n: "1",
                    icon: "📋",
                    label: "Paste message or upload screenshot",
                  },
                  {
                    n: "2",
                    icon: "🔍",
                    label: "We scan for 9 red-flag categories",
                  },
                  {
                    n: "3",
                    icon: "📊",
                    label: "Instant verdict with specific reasons",
                  },
                ].map((s) => (
                  <div className="step" key={s.n}>
                    <div className="step-num" aria-hidden="true">
                      {s.n}
                    </div>
                    <div className="step-icon" aria-hidden="true">
                      {s.icon}
                    </div>
                    <p>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Always-visible Red Flags Education ── */}
          {!isAnalyzing && <RedFlagsGuide />}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <p>
          ScamRadar for Interns is a free, open tool for students. Results are
          rule-based estimates — always verify independently.
        </p>
        <p className="footer-disclaimer">
          Privacy first. Ambiguous messages may be sent to an AI for secondary
          analysis, but no data is permanently stored or logged.
        </p>
      </footer>
    </div>
  );
}
