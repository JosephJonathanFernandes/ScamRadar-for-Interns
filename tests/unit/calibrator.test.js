import { describe, it, expect } from "vitest";
import { calibrateResult } from "../../src/core/scoreCalibrator.js";

describe("Score Calibrator", () => {
  it("calibrates a 16% rule score up to Suspicious when LLM returns suspicious", () => {
    const ruleResult = {
      verdict: "No Red Flags Found",
      score: 4,
      percentage: 16,
      flags: [
        { id: "urgency_pressure", weight: 2 },
        { id: "vague_role", weight: 2 },
      ],
      maxScore: 25,
    };

    const llmResult = {
      verdict: "suspicious",
      risk_score: 58,
      reasoning: "The message is vague and lacks official contact details.",
      matched_precedent_id: "scam_generic_wfh",
    };

    const calibrated = calibrateResult(ruleResult, llmResult);

    expect(calibrated.verdict).toBe("Suspicious");
    expect(calibrated.percentage).toBe(58);
    expect(calibrated.isUnified).toBe(true);
  });

  it("calibrates score to Likely Fake (>= 80%) when LLM returns fake", () => {
    const ruleResult = {
      verdict: "No Red Flags Found",
      score: 4,
      percentage: 16,
      flags: [{ id: "sensitive_info", weight: 4 }],
      maxScore: 25,
    };

    const llmResult = {
      verdict: "fake",
      risk_score: 90,
      reasoning: "Demands sensitive documents without any interview.",
      matched_precedent_id: "scam_techera_identity",
    };

    const calibrated = calibrateResult(ruleResult, llmResult);

    expect(calibrated.verdict).toBe("Likely Fake");
    expect(calibrated.percentage).toBeGreaterThanOrEqual(80);
  });

  it("lowers risk percentage when LLM confirms a genuine offer with minor rule noise", () => {
    const ruleResult = {
      verdict: "No Red Flags Found",
      score: 4,
      percentage: 16,
      flags: [{ id: "urgency_pressure", weight: 2 }, { id: "unrealistic_pay", weight: 2 }],
      maxScore: 25,
    };

    const llmResult = {
      verdict: "genuine",
      risk_score: 10,
      reasoning: "High stipend is standard for Google and candidate portal is official.",
      matched_precedent_id: "gen_high_stipend_mnc",
    };

    const calibrated = calibrateResult(ruleResult, llmResult);

    expect(calibrated.verdict).toBe("No Red Flags Found");
    expect(calibrated.percentage).toBeLessThanOrEqual(16);
  });

  it("retains Likely Fake if payment_request flag is present even if LLM says genuine", () => {
    const ruleResult = {
      verdict: "Likely Fake",
      score: 5,
      percentage: 20,
      flags: [{ id: "payment_request", weight: 5 }],
      maxScore: 25,
    };

    const llmResult = {
      verdict: "genuine",
      risk_score: 10,
      reasoning: "Seems okay.",
    };

    const calibrated = calibrateResult(ruleResult, llmResult);

    expect(calibrated.verdict).toBe("Likely Fake");
    expect(calibrated.percentage).toBeGreaterThanOrEqual(85);
  });
});
