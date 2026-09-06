import { analyzeMessage } from "../src/core/scanner.js";
import { checkCompany } from "../src/core/companyCheck.js";
import { retrievePrecedents } from "../src/core/rag/retriever.js";
import { calibrateResult } from "../src/core/scoreCalibrator.js";

async function testPipeline() {
  console.log("=== End-to-End RAG Pipeline & Calibration Verification ===\n");

  const testCases = [
    {
      name: "Noah's Reported Bug Case (Vague + Link + Urgency)",
      text: "URGENT hiring! Shortlisted for remote data role. Apply immediately at http://bit.ly/intern-role",
      simulatedLlm: {
        verdict: "suspicious",
        risk_score: 62,
        reasoning: "The message is vague, uses a short link, and doesn't give verifiable contact details, so it could be a scam.",
        matched_precedent_id: "scam_vague_data_entry"
      }
    },
    {
      name: "High-Stipend Google MNC Offer",
      text: "Dear Candidate, We are thrilled to offer you the SWE Summer Internship at Google India. Your monthly stipend will be Rs. 1,10,000. Please log into the candidate portal within 3 days to accept your offer.",
      simulatedLlm: {
        verdict: "genuine",
        risk_score: 10,
        reasoning: "High stipends are standard for Google and background verification via candidate portal is legitimate.",
        matched_precedent_id: "gen_high_stipend_mnc"
      }
    },
    {
      name: "Direct Telegram Task Scam",
      text: "Part time online job! Subscribe to our Telegram channel and earn Rs 1000 daily. Direct selection, no interview.",
      simulatedLlm: {
        verdict: "fake",
        risk_score: 95,
        reasoning: "Telegram channel daily task scheme is an advance-fee scam.",
        matched_precedent_id: "scam_telegram_task"
      }
    }
  ];

  for (const tc of testCases) {
    console.log(`--- Testing: ${tc.name} ---`);
    console.log(`Text: "${tc.text}"`);

    // 1. Company check & rule scan
    const companyFlags = await checkCompany(tc.text);
    const ruleResult = analyzeMessage(tc.text, companyFlags);
    console.log(`[Rule Scanner] Raw Score: ${ruleResult.score}, Raw %: ${ruleResult.percentage}%, Raw Verdict: "${ruleResult.verdict}"`);

    // 2. RAG Retrieval
    const precedents = retrievePrecedents(tc.text, { limit: 3 });
    console.log(`[RAG Retrieval] Retrieved ${precedents.length} precedent(s):`);
    precedents.forEach((p, idx) => {
      console.log(`   ${idx + 1}. [${p.type.toUpperCase()}] ${p.id} (${p.category}) - Score: ${p.score}`);
    });

    // 3. Calibrated Result
    const unified = calibrateResult(ruleResult, tc.simulatedLlm, precedents);
    console.log(`[Calibrated Result] Final Verdict: "${unified.verdict}", Final %: ${unified.percentage}%, Unified: ${unified.isUnified}`);
    console.log(`[Matched Precedent] ${unified.matchedPrecedent?.category || "None"}\n`);

    // Assertions
    if (tc.simulatedLlm.verdict === "suspicious") {
      if (unified.percentage === 16) {
        throw new Error("FAILED: Score remained hardcoded at 16%!");
      }
      if (unified.verdict !== "Suspicious") {
        throw new Error(`FAILED: Expected verdict Suspicious, got ${unified.verdict}`);
      }
    }
  }

  console.log("ALL E2E RAG PIPELINE CHECKS PASSED!");
}

testPipeline().catch((err) => {
  console.error("Test pipeline failed:", err);
  process.exit(1);
});
