import React, { useState } from "react";
import CheckerForm from "./components/CheckerForm.jsx";
import ResultCard from "./components/ResultCard.jsx";
import RedFlagsGuide from "./components/RedFlagsGuide.jsx";
import TestSuitePage from "./components/TestSuitePage.jsx";
import { analyzeMessage } from "./core/scanner.js";
import { checkCompany } from "./core/companyCheck.js";
import { calibrateResult } from "./core/scoreCalibrator.js";
import {
  ShieldIcon,
  LockIcon,
  TerminalIcon,
  FileTextIcon,
  SearchIcon,
  DatabaseIcon,
} from "./components/icons.jsx";

export default function App() {
  const [result, setResult] = useState(null);
  const [llmResult, setLlmResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTestSuite, setShowTestSuite] = useState(false);

  const handleAnalyze = async (text) => {
    setIsAnalyzing(true);
    setResult(null);
    setLlmResult(null);

    let analysis;
    try {
      const companyFlags = await checkCompany(text);
      analysis = analyzeMessage(text, companyFlags);
      setResult(calibrateResult(analysis, null));
    } catch {
      analysis = analyzeMessage(text, []);
      setResult(calibrateResult(analysis, null));
    }

    // Call LLM serverless function for ambiguous or non-obvious messages
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
            const unified = calibrateResult(analysis, data.result, data.precedents);
            setResult(unified);
          } else {
            setLlmResult({ verdict: "error" });
            setResult(calibrateResult(analysis, { verdict: "error" }, data?.precedents));
          }
        } else {
          setLlmResult({ verdict: "error" });
          setResult(calibrateResult(analysis, { verdict: "error" }));
        }
      } catch (err) {
        console.warn("LLM check failed:", err);
        setLlmResult({ verdict: "error" });
        setResult(calibrateResult(analysis, { verdict: "error" }));
      }
    }

    setIsAnalyzing(false);
  };

  const handleReset = () => {
    setResult(null);
    setLlmResult(null);
  };

  // ── Benchmark Suite View ───────────────────────────────────────────────────
  if (showTestSuite) {
    return (
      <div className="app-root">
        <header className="app-header">
          <div className="header-inner">
            <div className="logo-row">
              <div className="logo-emblem">
                <ShieldIcon size={22} />
              </div>
              <div>
                <div className="title-row">
                  <h1 className="app-title">ScamRadar</h1>
                  <span className="app-version-pill">THREAT INTEL</span>
                </div>
                <p className="app-tagline">
                  Internship Offer Threat & Fraud Intelligence
                </p>
              </div>
            </div>
            <div className="header-badge">
              <LockIcon size={13} />
              <span>Zero Data Retention</span>
            </div>
          </div>
        </header>
        <main className="app-main">
          <div className="content-container">
            <TestSuitePage onBack={() => setShowTestSuite(false)} />
          </div>
        </main>
        <footer className="app-footer">
          <div className="footer-inner">
            <p>
              ScamRadar Threat Intelligence · Designed for academic & student defense.
            </p>
            <p className="footer-disclaimer">
              Architecture operates with zero persistent storage. No candidate correspondence or extracted transcripts are logged to disk.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // ── Main App View ────────────────────────────────────────────────────────
  return (
    <div className="app-root">
      {/* ── Global Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo-row">
            <div className="logo-emblem">
              <ShieldIcon size={22} />
            </div>
            <div>
              <div className="title-row">
                <h1 className="app-title">ScamRadar</h1>
                <span className="app-version-pill">THREAT INTEL</span>
              </div>
              <p className="app-tagline">
                Internship Offer Threat & Fraud Intelligence
              </p>
            </div>
          </div>
          <div className="header-right">
            <button
              className="btn-test-suite"
              onClick={() => setShowTestSuite(true)}
              title="Open regression benchmark suite"
              aria-label="Open test suite"
              id="open-test-suite-btn"
            >
              <TerminalIcon size={14} />
              <span>Diagnostic Console</span>
            </button>
            <div className="header-badge">
              <LockIcon size={13} />
              <span>Zero-Retention Security</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="app-main">
        <div className="content-container">
          {/* ── Main Card ── */}
          <div className="checker-card">
            {isAnalyzing ? (
              <div className="analyzing-state" role="status" aria-live="polite">
                <div className="analyzing-spinner" aria-hidden="true" />
                <p className="analyzing-label">
                  Evaluating correspondence signatures…
                </p>
                <p className="analyzing-sub">
                  Running heuristic pattern scan and domain verification
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
                  <span className="section-eyebrow">FORENSIC INSPECTION</span>
                  <h2>Analyze Recruitment Communication</h2>
                  <p>
                    Audit unsolicited internship offers, forwarded messages, and hiring emails against 9 fraud vectors and verified reference precedents.
                  </p>
                </div>
                <CheckerForm onAnalyze={handleAnalyze} />
              </>
            )}
          </div>

          {/* ── Verification Pipeline ── */}
          {!result && !isAnalyzing && (
            <div className="how-it-works">
              <div className="pipeline-header">
                <span className="pipeline-eyebrow">EVALUATION ARCHITECTURE</span>
                <h2>Three-Stage Verification Pipeline</h2>
              </div>
              <div className="steps-row">
                <div className="step-card">
                  <div className="step-card-top">
                    <span className="step-idx">STAGE 01</span>
                    <FileTextIcon size={18} className="step-icon-svg" />
                  </div>
                  <h3 className="step-title">Ingestion & Normalization</h3>
                  <p className="step-desc">
                    Client-side OCR processing with automated WhatsApp timestamp & chat artifact stripping.
                  </p>
                </div>

                <div className="step-card">
                  <div className="step-card-top">
                    <span className="step-idx">STAGE 02</span>
                    <SearchIcon size={18} className="step-icon-svg" />
                  </div>
                  <h3 className="step-title">Heuristic Threat Audit</h3>
                  <p className="step-desc">
                    Regex rule engine scans for advance fees, equipment deposits, domain anomalies, and coercive urgency.
                  </p>
                </div>

                <div className="step-card">
                  <div className="step-card-top">
                    <span className="step-idx">STAGE 03</span>
                    <DatabaseIcon size={18} className="step-icon-svg" />
                  </div>
                  <h3 className="step-title">Precedent Grounding (RAG)</h3>
                  <p className="step-desc">
                    In-memory BM25 matching retrieves real-world reference cases to eliminate false alarms on high-stipend MNC offers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Threat Taxonomy Guide ── */}
          {!isAnalyzing && <RedFlagsGuide />}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <div className="footer-inner">
          <p>
            ScamRadar Threat Intelligence · Designed for student and fresher defense against fraudulent recruitment campaigns.
          </p>
          <p className="footer-disclaimer">
            Privacy-first architecture. All analyses run without persistent storage or data harvesting.
          </p>
        </div>
      </footer>
    </div>
  );
}
