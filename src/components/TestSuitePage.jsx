import React, { useState, useCallback } from "react";
import { TEST_CASES } from "../../tests/fixtures/validationData.js";
import { analyzeMessage } from "../core/scanner.js";
import {
  ShieldCheckIcon,
  ShieldAlertIcon,
  ShieldXIcon,
  ArrowLeftIcon,
} from "./icons.jsx";

const CATEGORY_COLORS = {
  "Obvious Scam": "cat-scam",
  Genuine: "cat-genuine",
  Borderline: "cat-borderline",
};

const VERDICT_SHORT = {
  "Likely Fake": { cls: "v-fake", Icon: ShieldXIcon },
  Suspicious: { cls: "v-suspicious", Icon: ShieldAlertIcon },
  "No Red Flags Found": { cls: "v-genuine", Icon: ShieldCheckIcon },
};

/**
 * In-browser benchmark runner.
 * Evaluates analyzeMessage() synchronously against validation cases.
 */
export default function TestSuitePage({ onBack }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const runTests = useCallback(async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 80));

    const output = TEST_CASES.map((tc) => {
      const analysis = analyzeMessage(tc.message, []);
      const pass = analysis.verdict === tc.expectedVerdict;
      return {
        ...tc,
        actualVerdict: analysis.verdict,
        flags: analysis.flags,
        pass,
      };
    });

    setResults(output);
    setRunning(false);
  }, []);

  const passed = results?.filter((r) => r.pass).length ?? 0;
  const total = TEST_CASES.length;
  const passRate = results ? Math.round((passed / total) * 100) : null;

  return (
    <div className="test-suite-page">
      {/* ── Header ── */}
      <div className="test-suite-header">
        <div className="test-suite-title-row">
          <button
            className="btn-back-to-app"
            onClick={onBack}
            aria-label="Back to main console"
          >
            <ArrowLeftIcon size={14} />
            <span>Return to Scanner</span>
          </button>
          <div>
            <h2 className="test-suite-title">Heuristic Benchmark Console</h2>
            <p className="test-suite-subtitle">
              {total} automated regression cases · Evaluates core pattern recognition rules
            </p>
          </div>
        </div>

        <button
          className={`btn-run-tests ${running ? "btn-run-tests--running" : ""}`}
          onClick={runTests}
          disabled={running}
          id="run-tests-btn"
        >
          {running ? (
            <>
              <span className="btn-spinner" aria-hidden="true" /> Running Benchmark…
            </>
          ) : (
            <>{results ? "Re-execute Test Suite" : "Execute Benchmark Suite"}</>
          )}
        </button>
      </div>

      {/* ── Summary Banner ── */}
      {results && (
        <div
          className={`test-summary ${passed === total ? "test-summary--pass" : passed >= total * 0.8 ? "test-summary--warn" : "test-summary--fail"}`}
        >
          <div className="test-summary-score">
            <span className="test-summary-num">{passed}</span>
            <span className="test-summary-denom">/ {total}</span>
          </div>
          <div className="test-summary-text">
            <strong>
              {passed === total
                ? "All automated regression benchmarks passed."
                : `${passed} of ${total} benchmark cases passed`}
            </strong>
            <span className="test-summary-rate">{passRate}% success rate</span>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      {!results && !running && (
        <div className="test-legend">
          <div className="legend-item">
            <span className="legend-dot legend-dot--scam" />
            <span>Obvious Scams — Expected Verdict: Likely Fake</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--genuine" />
            <span>Genuine Communications — Expected Verdict: No Red Flags Found</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--borderline" />
            <span>Borderline Cases — Subtle edge cases requiring precision scoring</span>
          </div>
        </div>
      )}

      {/* ── Test Result Cards ── */}
      {results && (
        <div className="test-results-list">
          {results.map((r, i) => {
            const exp = VERDICT_SHORT[r.expectedVerdict] || VERDICT_SHORT["No Red Flags Found"];
            const act = VERDICT_SHORT[r.actualVerdict] || VERDICT_SHORT["No Red Flags Found"];
            const ExpIcon = exp.Icon;
            const ActIcon = act.Icon;

            return (
              <div
                key={r.id}
                className={`test-card ${r.pass ? "test-card--pass" : "test-card--fail"}`}
              >
                <div className="test-card-top">
                  <span className="test-card-num">CASE #{i + 1}</span>
                  <span className={`test-card-cat ${CATEGORY_COLORS[r.category] || ""}`}>
                    {r.category}
                  </span>
                  <span
                    className={`test-pass-badge ${r.pass ? "badge--pass" : "badge--fail"}`}
                  >
                    {r.pass ? "PASS" : "FAIL"}
                  </span>
                </div>

                <p className="test-card-desc">{r.description}</p>
                <blockquote className="test-card-msg">
                  "{r.message.slice(0, 140)}…"
                </blockquote>

                <div className="test-verdicts-row">
                  <div className="test-verdict-box">
                    <span className="test-vlabel">Target:</span>
                    <span className={`test-vval ${exp.cls}`}>
                      <ExpIcon size={14} />
                      {r.expectedVerdict}
                    </span>
                  </div>
                  <div className="test-verdict-box">
                    <span className="test-vlabel">Engine Result:</span>
                    <span className={`test-vval ${act.cls}`}>
                      <ActIcon size={14} />
                      {r.actualVerdict}
                    </span>
                  </div>
                </div>

                {r.flags.length > 0 && (
                  <div className="test-flags-row">
                    <span className="test-flags-label">Triggered Rules:</span>
                    {r.flags.map((f) => (
                      <span key={f.id} className="test-flag-tag">
                        {f.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
