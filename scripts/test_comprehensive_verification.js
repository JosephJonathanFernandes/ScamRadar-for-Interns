import { retrievePrecedents } from "../src/core/rag/retriever.js";
import { calibrateResult } from "../src/core/scoreCalibrator.js";
import { getGroqKeys } from "../src/api/llm-check.js";
import handler from "../src/api/llm-check.js";
import { analyzeMessage } from "../src/core/scanner.js";

async function runComprehensiveVerification() {
  console.log("==========================================================");
  console.log("       SCAMRADAR COMPREHENSIVE IMPLEMENTATION VERIFICATION ");
  console.log("==========================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    } else {
      console.log(`✅ PASS: ${message}`);
      passedTests++;
    }
  }

  // -------------------------------------------------------------
  // TEST SUITE 1: DYNAMIC KEY DISCOVERY & ROTATION
  // -------------------------------------------------------------
  console.log("\n--- [SUITE 1] Dynamic Groq Key Discovery ---");
  {
    const originalEnv = { ...process.env };

    // Scenario A: 0 keys
    for (const k of Object.keys(process.env)) {
      if (/^GROQ_/i.test(k)) delete process.env[k];
    }
    assert(getGroqKeys().length === 0, "Discovers 0 keys when none are in env");

    // Scenario B: 2 keys (Noah's exact .env setup)
    process.env.GROQ_KEY_1 = "gsk_test_key_1";
    process.env.GROQ_KEY_2 = "gsk_test_key_2";
    const twoKeys = getGroqKeys();
    assert(twoKeys.length === 2, "Discovers exactly 2 keys when 2 are in env (Noah's config)");
    assert(twoKeys[0] === "gsk_test_key_1" && twoKeys[1] === "gsk_test_key_2", "Maintains numeric order of keys");

    // Scenario C: Arbitrary N keys + single GROQ_API_KEY
    process.env.GROQ_API_KEY = "gsk_primary_key";
    process.env.GROQ_KEY_5 = "gsk_test_key_5";
    const multiKeys = getGroqKeys();
    assert(multiKeys.length === 4, "Supports mixed single and indexed keys dynamically");
    assert(multiKeys.includes("gsk_primary_key"), "Includes primary GROQ_API_KEY");

    // Restore env
    process.env = { ...originalEnv };
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: RAG RETRIEVER ON 10 REAL-WORLD MESSAGE PROFILES
  // -------------------------------------------------------------
  console.log("\n--- [SUITE 2] RAG Precedent Retrieval Across Diverse Profiles ---");
  const testProfiles = [
    {
      name: "Advance-Fee Data Entry Scam",
      text: "Data entry work from home. Earn Rs 15000/month. Pay Rs 500 registration fee to get login id.",
      expectedType: "scam",
      expectedKeywords: ["data_entry", "deposit", "fee", "axis"]
    },
    {
      name: "Identity Harvesting Scam",
      text: "Selected for Social Media Intern. Send your Aadhaar, PAN card, and Bank IFSC number on WhatsApp.",
      expectedType: "scam",
      expectedKeywords: ["identity", "techera"]
    },
    {
      name: "Telegram Task Scam",
      text: "Online part time job. Subscribe to Telegram channels and like YouTube videos to earn Rs 1000 daily.",
      expectedType: "scam",
      expectedKeywords: ["telegram", "task", "youtube"]
    },
    {
      name: "Software Purchase Scam",
      text: "Selected for Graphic Designer role. To start, you must purchase company Adobe software license for Rs 2500.",
      expectedType: "scam",
      expectedKeywords: ["software", "purchase"]
    },
    {
      name: "Fake Government Scheme",
      text: "Ministry of IT Internship 2024. Only 10 slots. Apply immediately at admin@nic-internships-india.com.",
      expectedType: "scam",
      expectedKeywords: ["govt", "nic", "ministry"]
    },
    {
      name: "Top-Tier MNC High Stipend (Google)",
      text: "We are thrilled to offer you the SWE Summer Internship at Google India. Stipend: Rs 1,10,000/month. Accept via portal.",
      expectedType: "genuine",
      expectedKeywords: ["high_stipend", "mnc"]
    },
    {
      name: "Startup Informal DM (BuildSpace)",
      text: "Loved the github repo you shared. Want to intern with us at BuildSpace this summer? 20k a month, let me know ASAP.",
      expectedType: "genuine",
      expectedKeywords: ["startup", "informal", "founder"]
    },
    {
      name: "Campus Placement Forward (Infosys / TPO)",
      text: "*URGENT PLACEMENT UPDATE* Infosys off-campus internship drive. Fill the Google Form by 5 PM today: https://forms.gle/xyz",
      expectedType: "genuine",
      expectedKeywords: ["tpo", "forward", "announcement"]
    },
    {
      name: "University Research Fellowship",
      text: "Selected for Summer Research Fellowship in ML. Submit NOC and college ID card to dean.research@iisc.ac.in.",
      expectedType: "genuine",
      expectedKeywords: ["research", "intern", "formal"]
    },
    {
      name: "Legitimate Remote Content Writing Gig",
      text: "Looking for content intern for tech blog. Remote, 10k/month. Submit writing sample within 2 days.",
      expectedType: "genuine",
      expectedKeywords: ["content", "wfh", "startup"]
    }
  ];

  for (const profile of testProfiles) {
    const precedents = retrievePrecedents(profile.text, { limit: 3 });
    assert(precedents.length > 0, `RAG retrieves precedents for: ${profile.name}`);

    const topPrecedent = precedents[0];
    const topMatchesType = topPrecedent.type === profile.expectedType;
    const matchesAnyExpectedKeyword = profile.expectedKeywords.some(kw =>
      topPrecedent.id.toLowerCase().includes(kw) || topPrecedent.category.toLowerCase().includes(kw)
    );

    assert(
      topMatchesType || precedents.some(p => p.type === profile.expectedType),
      `RAG returned correct ${profile.expectedType.toUpperCase()} precedent in top-K for ${profile.name}`
    );
    console.log(`   └─ Top match: [${topPrecedent.type.toUpperCase()}] ${topPrecedent.id} (${topPrecedent.category}) | Score: ${topPrecedent.score}`);
  }

  // -------------------------------------------------------------
  // TEST SUITE 3: SCORE CALIBRATOR MATRIX & 16% BUG RESOLUTION
  // -------------------------------------------------------------
  console.log("\n--- [SUITE 3] Unified Score Calibrator Matrix ---");
  {
    // Case 1: The exact case Noah tested (4 rule points -> 16% raw score)
    const rawAnalysis = {
      verdict: "No Red Flags Found",
      score: 4,
      percentage: 16,
      flags: [
        { id: "urgency_pressure", weight: 2, label: "Urgency" },
        { id: "vague_role", weight: 2, label: "Vague Role" }
      ],
      maxScore: 25
    };

    // When LLM flags as Suspicious
    const llmSuspicious = {
      verdict: "suspicious",
      risk_score: 60,
      reasoning: "Vague role with artificial urgency.",
      matched_precedent_id: "scam_vague_data_entry"
    };
    const calibratedSuspicious = calibrateResult(rawAnalysis, llmSuspicious);
    assert(calibratedSuspicious.verdict === "Suspicious", "Converts verdict from 'No Red Flags Found' to 'Suspicious'");
    assert(calibratedSuspicious.percentage === 60, "Calibrates percentage from 16% to 60% (eliminating 16% bug)");
    assert(calibratedSuspicious.isUnified === true, "Marks result as unified");

    // When LLM flags as Fake
    const llmFake = {
      verdict: "fake",
      risk_score: 90,
      reasoning: "Confirmed scam pattern.",
      matched_precedent_id: "scam_generic_wfh"
    };
    const calibratedFake = calibrateResult(rawAnalysis, llmFake);
    assert(calibratedFake.verdict === "Likely Fake", "Converts verdict to 'Likely Fake'");
    assert(calibratedFake.percentage >= 80, "Elevates percentage into high-risk red band (>= 80%)");

    // When LLM confirms genuine offer with minor noise
    const llmGenuine = {
      verdict: "genuine",
      risk_score: 10,
      reasoning: "Informal founder outreach with no fees.",
      matched_precedent_id: "gen_startup_informal"
    };
    const calibratedGenuine = calibrateResult(rawAnalysis, llmGenuine);
    assert(calibratedGenuine.verdict === "No Red Flags Found", "Retains 'No Red Flags Found' for genuine offer");
    assert(calibratedGenuine.percentage <= 16, "Reduces percentage to low-risk green band (<= 16%)");

    // Safety override: payment_request flag MUST remain Likely Fake
    const paymentAnalysis = {
      verdict: "Likely Fake",
      score: 5,
      percentage: 20,
      flags: [{ id: "payment_request", weight: 5, label: "Payment Request" }],
      maxScore: 25
    };
    const calibratedPayment = calibrateResult(paymentAnalysis, llmGenuine);
    assert(calibratedPayment.verdict === "Likely Fake", "Safety override: payment_request rule overrides LLM genuine claim");
    assert(calibratedPayment.percentage >= 80, "Safety override: retains high-risk percentage");
  }

  // -------------------------------------------------------------
  // TEST SUITE 4: API ROUTE HANDLER ROBUSTNESS
  // -------------------------------------------------------------
  console.log("\n--- [SUITE 4] API Route Handler (/api/llm-check) Robustness ---");
  {
    // Test rejection of non-POST
    let getStatusCode = 200;
    const getRes = {
      status: (c) => { getStatusCode = c; return getRes; },
      json: () => {}
    };
    await handler({ method: "GET" }, getRes);
    assert(getStatusCode === 405, "Rejects non-POST requests with 405 Method Not Allowed");

    // Test rejection of empty body
    let emptyStatusCode = 200;
    const emptyRes = {
      status: (c) => { emptyStatusCode = c; return emptyRes; },
      json: () => {}
    };
    await handler({ method: "POST", body: {} }, emptyRes);
    assert(emptyStatusCode === 400, "Rejects empty message with 400 Bad Request");

    // Test graceful fallback when no API keys are present
    const originalEnv = { ...process.env };
    for (const k of Object.keys(process.env)) {
      if (/^GROQ_/i.test(k)) delete process.env[k];
    }

    let noKeyData = null;
    const noKeyRes = {
      status: () => noKeyRes,
      json: (d) => { noKeyData = d; }
    };
    await handler({ method: "POST", body: { message: "Test offer" } }, noKeyRes);
    assert(noKeyData.llmAvailable === false, "Fails gracefully with llmAvailable: false when 0 keys configured");

    process.env = { ...originalEnv };
  }

  console.log("\n==========================================================");
  console.log(`ALL IMPLEMENTATION TESTS PASSED: ${passedTests}/${totalTests} checks passed!`);
  console.log("==========================================================\n");
}

runComprehensiveVerification().catch((err) => {
  console.error("Verification script encountered an error:", err);
  process.exit(1);
});
