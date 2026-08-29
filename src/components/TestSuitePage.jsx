import React, { useState, useCallback } from "react";
import { TEST_CASES } from "../testCases";
import { analyzeMessage } from "../scanner";

const CATEGORY_COLORS = {
  "Obvious Scam": "cat-scam",
  "Genuine": "cat-genuine",
  "Borderline": "cat-borderline",
};

const VERDICT_SHORT = {
  "Likely Fake": { cls: "v-fake", icon: "🚨" },
  "Suspicious": { cls: "v-suspicious", icon: "⚠️" },
  "No Red Flags Found": { cls: "v-genuine", icon: "✅" },
};

/**
 * In-browser test suite runner.
 * Calls analyzeMessage() synchronously with no company flags — validates the
 * original 7 scanner rules only (per plan: company-check flags are verified
 * manually via the main UI).
 */
export default function TestSuitePage({ onBack }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const runTests = useCallback(async () => {
    setRunning(true);
    // Small delay so the button spinner renders before the synchronous CPU burst
    await new Promise((r) => setTimeout(r, 80));

    const output = TEST_CASES.map((tc) => {
      // analyzeMessage is synchronous when called without company flags
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
          <button className="btn-back-to-app" onClick={onBack} aria-label="Back to main app">
            ← Back
          </button>
          <div>
            <h2 className="test-suite-title">🧪 Rule Engine Test Suite</h2>
            <p className="test-suite-subtitle">
              {total} test cases · validates the 7 core scanner rules · no company-check flags
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
            <><span className="btn-spinner" aria-hidden="true" /> Running…</>
          ) : (
            <>{results ? "↺ Re-run All Tests" : "▶ Run All 15 Tests"}</>
          )}
        </button>
      </div>

      {/* ── Summary Banner ── */}
      {results && (
        <div className={`test-summary ${passed === total ? "test-summary--pass" : passed >= total * 0.8 ? "test-summary--warn" : "test-summary--fail"}`}>
          <div className="test-summary-score">
            <span className="test-summary-num">{passed}</span>
            <span className="test-summary-denom">/ {total}</span>
          </div>
          <div className="test-summary-text">
            <strong>{passed === total ? "All tests passed! ✅" : `${passed} of ${total} tests passed`}</strong>
            <span className="test-summary-rate">{passRate}% pass rate</span>
          </div>
          {passed < total && (
            <p className="test-summary-hint">
              Failing borderline cases may indicate rule gaps or intentional scanner blind-spots (see descriptions).
            </p>
          )}
        </div>
      )}

      {/* ── Legend ── */}
      {!results && !running && (
        <div className="test-legend">
          <div className="legend-item">
            <span className="legend-dot legend-dot--scam" />
            <span>5 Obvious Scams — all rules should fire, verdict: Likely Fake</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--genuine" />
            <span>5 Genuine Messages — no rules should fire, verdict: Likely Genuine</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--borderline" />
            <span>5 Borderline Cases — indirect language, non-native phrasing, subtle gaps</span>
          </div>
        </div>
      )}

      {/* ── Results Table ── */}
      {results && (
        <div className="test-table-wrap">
          <table className="test-table" aria-label="Test results">
            <thead>
              <tr>
                <th>#</th>
                <th>Category</th>
                <th>Description</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Flags Triggered</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr
                  key={r.id}
                  className={`test-row ${r.pass ? "test-row--pass" : "test-row--fail"}`}
                >
                  <td className="test-cell-num">{i + 1}</td>
                  <td>
                    <span className={`test-cat-badge ${CATEGORY_COLORS[r.category]}`}>
                      {r.category}
                    </span>
                  </td>
                  <td className="test-cell-desc">
                    <span className="test-desc-text">{r.description}</span>
                    <details className="test-message-details">
                      <summary>View message</summary>
                      <pre className="test-message-preview">{r.message}</pre>
                    </details>
                  </td>
                  <td>
                    <span className={`test-verdict ${VERDICT_SHORT[r.expectedVerdict]?.cls}`}>
                      {VERDICT_SHORT[r.expectedVerdict]?.icon} {r.expectedVerdict}
                    </span>
                  </td>
                  <td>
                    <span className={`test-verdict ${VERDICT_SHORT[r.actualVerdict]?.cls}`}>
                      {VERDICT_SHORT[r.actualVerdict]?.icon} {r.actualVerdict}
                    </span>
                  </td>
                  <td className="test-cell-flags">
                    {r.flags.length === 0 ? (
                      <span className="test-no-flags">none</span>
                    ) : (
                      <ul className="test-flags-list">
                        {r.flags.map((f) => (
                          <li key={f.id} className="test-flag-pill">
                            {f.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="test-cell-result">
                    <span className={`test-result-badge ${r.pass ? "test-badge--pass" : "test-badge--fail"}`}>
                      {r.pass ? "✓ Pass" : "✗ Fail"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Note about company check ── */}
      <div className="test-suite-note">
        <p>
          <strong>Note:</strong> This suite validates the 7 original rule-based flags only.
          The company verification layer (domain mismatch, web presence) is async and must
          be verified manually — paste a message with a known company name via the main UI.
        </p>
      </div>
    </div>
  );
}
