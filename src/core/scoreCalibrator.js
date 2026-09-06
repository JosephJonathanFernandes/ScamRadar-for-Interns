/**
 * ScamRadar Score Calibrator
 *
 * Unifies client-side rule analysis with server-side LLM & RAG precedent evaluations
 * to ensure that the Risk Level percentage, progress bar color, and verdict title
 * are 100% consistent and never contradictory.
 */

/**
 * Calibrate and unify scanner rule results with LLM / RAG results.
 *
 * @param {Object} ruleResult - { verdict, score, percentage, flags, maxScore }
 * @param {Object|null} llmResult - { verdict, risk_score, reasoning, matched_precedent_id, ... }
 * @param {Array} [precedents=[]] - Retrieved RAG precedents
 * @returns {Object} Unified result
 */
export function calibrateResult(ruleResult, llmResult = null, precedents = []) {
  if (!ruleResult) {
    return {
      verdict: null,
      score: 0,
      percentage: 0,
      flags: [],
      maxScore: 25,
      isUnified: false,
    };
  }

  // Base values from rule scanner
  let finalVerdict = ruleResult.verdict;
  let finalPercentage = ruleResult.percentage;
  const flags = [...(ruleResult.flags || [])];
  const hasPaymentFlag = flags.some((f) => f.id === "payment_request");

  // Rule-based calibration safeguard:
  // If 3 or more red flags are detected, the message cannot be "No Red Flags Found".
  if (finalVerdict === "No Red Flags Found" && flags.length >= 2) {
    if (flags.length >= 3 || ruleResult.score >= 4) {
      finalVerdict = "Suspicious";
      finalPercentage = Math.max(finalPercentage, 45);
    }
  }

  // If no LLM ran or LLM returned an error, return calibrated rule result
  if (!llmResult || llmResult.verdict === "error" || !llmResult.verdict) {
    return {
      ...ruleResult,
      verdict: finalVerdict,
      percentage: finalPercentage,
      flags,
      llmResult: null,
      matchedPrecedent: null,
      isUnified: false,
    };
  }

  const llmVerdict = llmResult.verdict.toLowerCase();
  const llmRisk = typeof llmResult.risk_score === "number" ? llmResult.risk_score : null;

  // Resolve matching precedent if present
  let matchedPrecedent = null;
  if (llmResult.matched_precedent_id && Array.isArray(precedents)) {
    matchedPrecedent =
      precedents.find((p) => p.id === llmResult.matched_precedent_id) || null;
  }
  if (!matchedPrecedent && Array.isArray(precedents) && precedents.length > 0) {
    // Default to top scoring precedent
    matchedPrecedent = precedents[0];
  }

  // ── Unified Calibration Matrix ─────────────────────────────────────────────
  if (llmVerdict === "fake") {
    // LLM identified as fake/scam
    finalVerdict = "Likely Fake";
    finalPercentage = Math.max(ruleResult.percentage, llmRisk ?? 88, 80);
  } else if (llmVerdict === "suspicious") {
    // LLM identified as suspicious
    if (hasPaymentFlag || ruleResult.score >= 7) {
      finalVerdict = "Likely Fake";
      finalPercentage = Math.max(ruleResult.percentage, llmRisk ?? 80, 80);
    } else {
      finalVerdict = "Suspicious";
      // Ensure risk percentage sits in the amber/suspicious band (50% - 75%)
      finalPercentage = Math.min(
        75,
        Math.max(ruleResult.percentage, llmRisk ?? 60, 52)
      );
    }
  } else if (llmVerdict === "genuine") {
    // LLM verified offer as genuine
    if (hasPaymentFlag) {
      // Hard safety override: legitimate companies never ask for registration fees/deposits
      finalVerdict = "Likely Fake";
      finalPercentage = Math.max(ruleResult.percentage, 85);
    } else if (ruleResult.score >= 6) {
      // Multiple strong rule flags exist; retain Suspicious for caution
      finalVerdict = "Suspicious";
      finalPercentage = Math.min(50, Math.max(ruleResult.percentage, 40));
    } else {
      // Minor flags (e.g. conversational urgency, link shortener, high stipend) are cleared by LLM
      finalVerdict = "No Red Flags Found";
      // Calibrate risk down to genuine/clean band (5% - 20%)
      finalPercentage = Math.min(ruleResult.percentage, llmRisk ?? 12, 18);
    }
  }

  // Ensure percentage stays strictly within 0 - 100
  finalPercentage = Math.min(100, Math.max(0, Math.round(finalPercentage)));

  return {
    ...ruleResult,
    verdict: finalVerdict,
    percentage: finalPercentage,
    flags,
    llmResult: {
      verdict: llmResult.verdict,
      reasoning: llmResult.reasoning,
      riskScore: llmResult.risk_score,
      matchedPrecedentId: llmResult.matched_precedent_id,
    },
    matchedPrecedent,
    isUnified: true,
  };
}
