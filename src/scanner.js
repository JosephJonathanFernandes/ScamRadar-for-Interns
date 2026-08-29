/**
 * ScamRadar for Interns — Rule-based red-flag scanner
 * All matching is case-insensitive and runs entirely client-side.
 */

// ─── Rule Definitions ────────────────────────────────────────────────────────

const RULES = [
  {
    id: "payment_request",
    label: "Payment / Fee Request",
    weight: 5, // heaviest — almost always a scam
    description:
      "Legitimate internships never ask you to pay money upfront — for registration, training, kit, or security deposit.",
    check(text) {
      const patterns = [
        // Named fee types — these phrases are unambiguous regardless of amount
        /registration\s*fee/i,
        /refundable\s*deposit/i,
        /security\s*deposit/i,
        /training\s*kit\s*(?:charge|fee|cost|payment)?/i,
        /processing\s*charge/i,
        /joining\s*fee/i,
        /enrollment\s*fee/i,
        /documentation\s*(?:fee|charge|cost)/i,
        /verification\s*(?:fee|charge|deposit)/i,
        /activation\s*(?:fee|charge)/i,
        // Amount + scam action word  —  require "pay/deposit/send/transfer/charge"
        // AFTER the amount to avoid matching "Rs 10,000/month stipend"
        /(?:₹|rs\.?|inr)\s*[\d,]+\s*(?:pay|deposit|fee|charge|send|transfer)/i,
        // Scam action word BEFORE the amount — "pay Rs 500", "deposit the ₹200"
        /\b(?:pay|deposit|send|transfer)(?:\s+(?:the|an|a|your|my|this))?\s+(?:₹|rs\.?|inr)\s*[\d,]+/i,
        // "pay ₹" / "pay Rs" — action + currency symbol together
        /\bpay\s+(?:the\s+)?(?:₹|rs\.?\s)/i,
        // "fee of ₹/Rs X" — "fee" before currency+amount
        /\b(?:fee|charge)\s+(?:of|for)\s+(?:₹|rs\.?|inr)\s*[\d,]+/i,
      ];
      const matches = patterns.filter((p) => p.test(text)).length;
      return matches > 0
        ? {
            triggered: true,
            detail: "Message mentions a payment, fee, or deposit requirement.",
          }
        : { triggered: false };
    },
  },
  {
    id: "personal_email",
    label: "Personal Email Domain Used",
    weight: 3,
    description:
      "Real companies contact candidates from their own domain (e.g. @company.com), not Gmail/Yahoo/Outlook.",
    check(text) {
      const pattern =
        /\b[\w.+-]+@(?:gmail|yahoo|outlook|hotmail|rediffmail|ymail|live)\.\w+\b/i;
      if (pattern.test(text)) {
        const match = text.match(pattern);
        return {
          triggered: true,
          detail: `Personal email found: ${match[0]}`,
        };
      }
      return { triggered: false };
    },
  },
  {
    id: "urgency_pressure",
    label: "Artificial Urgency / Pressure",
    weight: 2,
    description:
      "Scammers rush you so you don't have time to verify. Real companies give you proper time to decide.",
    check(text) {
      const patterns = [
        // "reply/respond/revert/contact within X hours/days/minutes"
        /(?:reply|respond|revert|contact|get\s+back)\s+within\s+\d+\s*(?:hour|hr|day|minute|min)/i,
        /limited\s+seats?/i,
        /only\s+(?:today|this\s+week)/i,
        /immediate\s+joining/i,
        /last\s+(?:few|chance)/i,
        /urgent(?:ly)?\s+(?:required|hiring|needed)/i,
        /apply\s+(?:now|immediately|asap)/i,
        /hurry\s+up/i,
        /slots?\s+(?:are\s+)?filling/i,
        /don'?t\s+miss\s+this/i,
        /respond\s+immediately/i,
        /first\s+come[,\s]+first\s+serve/i,
        /offer\s+(?:expires?|valid)\s+(?:today|till|until)/i,
        // "last date to apply: today" / "last date: [date]"
        /last\s+date\s+(?:to\s+apply)?\s*[:\-–]?\s*today/i,
        // "your slot will be given to the next candidate"
        /slot\s+will\s+be\s+given/i,
        // "offer expires in X hours"
        /(?:offer|opportunity|seat)\s+(?:expires?|ends?)\s+in\s+\d+/i,
      ];
      const triggered = patterns.filter((p) => p.test(text));
      if (triggered.length) {
        return {
          triggered: true,
          detail: `Urgency language detected — e.g., "${triggered[0].exec(text)?.[0]}".`,
        };
      }
      return { triggered: false };
    },
  },
  {
    id: "no_interview",
    label: "No Proper Interview Process",
    weight: 3,
    description:
      "Legitimate employers interview candidates. Offers without any interview are a major red flag.",
    check(text) {
      const patterns = [
        /no\s+interview/i,
        /direct\s+selection/i,
        /direct(?:ly)?\s+(?:hired|selected|recruited)/i,
        /whatsapp\s+interview/i,
        /interview\s+(?:on|via|through)\s+whatsapp/i,
        /selected\s+without\s+interview/i,
        /pre[- ]?selected/i,
        /shortlisted\s+(?:already|directly)/i,
      ];
      const triggered = patterns.filter((p) => p.test(text));
      return triggered.length
        ? {
            triggered: true,
            detail: `No real interview process mentioned — e.g., "${triggered[0].exec(text)?.[0]}".`,
          }
        : { triggered: false };
    },
  },
  {
    id: "vague_role",
    label: "Vague or Generic Job Role",
    weight: 2,
    description:
      "Scam posts use generic job titles with no real deliverables to attract as many victims as possible.",
    check(text) {
      const patterns = [
        /easy\s+work\s+from\s+home/i,
        /work\s+from\s+home\s+(?:job|opportunity)/i,
        /data\s+entry\s+(?:job|work|opportunity)/i,
        /copy\s+(?:and\s+)?paste\s+(?:job|work)/i,
        /simple\s+(?:online\s+)?task/i,
        /part[- ]?time\s+(?:online\s+)?job/i,
        /earn\s+(?:money|income|cash)\s+(?:from\s+home|online|easily)/i,
        /earn\s+(?:₹|rs\.?|inr)?\s*[\d,]+\s*(?:-|to)\s*(?:₹|rs\.?|inr)?\s*[\d,]+\s+(?:daily|weekly|everyday)/i,
        /no\s+(?:experience|skill|qualification)\s+(?:needed|required)/i,
        /anyone\s+can\s+(?:do|apply|join)/i,
        /just\s+(?:sit|stay)\s+at\s+home/i,
      ];
      const triggered = patterns.filter((p) => p.test(text));
      return triggered.length
        ? {
            triggered: true,
            detail: `Vague or no-skill job description — e.g., "${triggered[0].exec(text)?.[0]}".`,
          }
        : { triggered: false };
    },
  },
  {
    id: "unrealistic_pay",
    label: "Unrealistically High Stipend",
    weight: 2,
    description:
      "Offering ₹50,000+ per month for a fresher/intern role is uncommon and used as bait.",
    check(text) {
      // Match Rs/₹ + number + /month (or per month variant)
      const amountPattern =
        /(?:₹|rs\.?|inr)\s*([\d,]+)\s*(?:\/|-|\s)?(?:month|pm|per\s*month)\b/i;
      // "1 lakh/month" or "1.5 lakh per month" — require full word "lakh" or "lac"
      const lakhPattern =
        /(\d+(?:\.\d+)?)\s*(?:lakh|lac)\b\s*(?:\/|-|\s)?(?:month|pm|per\s*month\b)?/i;
      // "stipend of Rs X/month" via keyword
      const plainPattern =
        /(?:stipend|salary|package|ctc)\s*(?:of|is|:)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\s*(?:\/|-|\s)?(?:month|pm|per\s*month)\b/i;
      // Daily/Weekly earnings
      const dailyWeeklyPattern =
        /(?:earn|make|salary|pay)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\s*(?:daily|per\s*day|a\s*day|weekly|per\s*week|a\s*week)/i;

      let amount = null;
      let matchStr = "";

      const m1 = amountPattern.exec(text);
      if (m1) {
        amount = parseInt(m1[1].replace(/,/g, ""), 10);
        matchStr = m1[0];
      }
      const m2 = lakhPattern.exec(text);
      if (m2) {
        const lakhAmount = parseFloat(m2[1]) * 100000;
        if (!amount || lakhAmount > amount) {
          amount = lakhAmount;
          matchStr = m2[0];
        }
      }
      const m3 = plainPattern.exec(text);
      if (m3 && !amount) {
        amount = parseInt(m3[1].replace(/,/g, ""), 10);
        matchStr = m3[0];
      }
      const m4 = dailyWeeklyPattern.exec(text);
      if (m4 && !amount) {
        let baseAmount = parseInt(m4[1].replace(/,/g, ""), 10);
        const isWeekly = m4[0].toLowerCase().includes("week");
        // Convert to monthly equivalent for the check
        amount = isWeekly ? baseAmount * 4 : baseAmount * 30;
        matchStr = m4[0];
      }

      if (amount && amount >= 50000) {
        return {
          triggered: true,
          detail: `Unusually high stipend mentioned: "${matchStr.trim()}" — this is likely bait.`,
        };
      }
      return { triggered: false };
    },
  },
  {
    id: "sensitive_info",
    label: "Requests Sensitive Personal Information",
    weight: 4,
    description:
      "Asking for Aadhaar, PAN, bank details, or IFSC before issuing an offer letter is a serious red flag — this info can be misused for fraud.",
    check(text) {
      const patterns = [
        /\baadhaar\b/i,
        /\baadhar\b/i,
        /\bpan\s*(?:card|number|no)\b/i,
        /\bbank\s*(?:account|acc|a\/c)\b/i,
        /\bifsc\b/i,
        /\bpassbook\b/i,
        /\bvoting\s*(?:card|id)\b/i,
        /\bpassport\s*(?:number|no|copy)\b/i,
        /\bdriving\s*licen[cs]e\b/i,
      ];
      const triggered = patterns.filter((p) => p.test(text));
      return triggered.length
        ? {
            triggered: true,
            detail: `Requests sensitive personal information — e.g., "${triggered.map((p) => p.exec(text)?.[0]).join(", ")}".`,
          }
        : { triggered: false };
    },
  },
];

// ─── Scorer ──────────────────────────────────────────────────────────────────

/**
 * Analyzes a message against all 7 scanner rules plus any pre-computed
 * company-verification flags supplied by checkCompany() in App.jsx.
 *
 * Keeping this function synchronous keeps the test suite fast and avoids
 * coupling scanner logic to async network calls.
 *
 * @param {string} text            - The raw message text to analyze
 * @param {Array}  [companyFlags]  - Optional flags from companyCheck.js (same shape)
 * @returns {{ verdict: string, score: number, percentage: number, flags: Array, maxScore: number }}
 */
export function analyzeMessage(text, companyFlags = []) {
  if (!text || !text.trim()) {
    return { verdict: null, score: 0, percentage: 0, flags: [], maxScore: 0 };
  }

  const flags = [];
  let totalScore = 0;
  let hasPaymentFlag = false;

  // ── Run the 7 core rules ──────────────────────────────────────────────────
  for (const rule of RULES) {
    const result = rule.check(text);
    if (result.triggered) {
      flags.push({
        id: rule.id,
        label: rule.label,
        weight: rule.weight,
        detail: result.detail,
        description: rule.description,
      });
      totalScore += rule.weight;
      if (rule.id === "payment_request") hasPaymentFlag = true;
    }
  }

  // ── Merge company-verification flags ──────────────────────────────────────
  for (const cf of companyFlags) {
    flags.push(cf);
    totalScore += cf.weight ?? 1;
  }

  // Percentage is relative to the max score of the 7 core rules so that the
  // bar stays calibrated even when company flags add extra weight.
  // We cap at 100 so it never overflows.
  const maxScore = RULES.reduce((s, r) => s + r.weight, 0);
  const percentage = Math.min(100, Math.round((totalScore / maxScore) * 100));

  // ── Verdict thresholds ───────────────────────────────────────────────────
  let verdict;
  if (hasPaymentFlag || totalScore >= 7) {
    verdict = "Likely Fake";
  } else if (totalScore >= 5) {
    verdict = "Suspicious";
  } else {
    verdict = "No Red Flags Found";
  }

  return { verdict, score: totalScore, percentage, flags, maxScore };
}

export { RULES };
