/**
 * companyCheck.js — Company Verification Layer
 *
 * Extracts company name + email domain from message text, then runs:
 *   (a) Domain-name similarity check  — pure client-side string matching
 *   (b) Web presence check            — DuckDuckGo Instant Answer API (2 s timeout,
 *                                       gracefully skipped on any network failure)
 *
 * Returns Promise<FlagObject[]> — same shape as scanner.js rule flags so they
 * can be passed directly into analyzeMessage() as the second argument.
 */

// ─── Company Name Extraction ──────────────────────────────────────────────────

const CORP_SUFFIXES =
  "(?:Pvt\\.?\\s*Ltd\\.?|Ltd\\.?|Inc\\.?|LLC|LLP|" +
  "Technologies|Tech|Solutions|Corp\\.?|Consulting|" +
  "Systems|Services|Group|Foundation|Ventures|" +
  "Analytics|Infotech|Infosystems)";

/**
 * Ordered list of extraction patterns.
 * Each returns capture group 1 as the candidate company name.
 */
const COMPANY_PATTERNS = [
  // "internship at TechCorp Pvt Ltd" / "position at BrightMark Agency"
  new RegExp(
    `\\b(?:internship|position|role|opportunity|opening|job)\\s+(?:at|with|in)\\s+([A-Z][a-zA-Z&]+(?:\\s+[A-Z][a-zA-Z&]+)*)`,
    "i"
  ),
  // "at TechCorp Solutions" / "from XYZ Consulting"
  new RegExp(
    `\\b(?:at|from|by|with)\\s+([A-Z][a-zA-Z&]+(?:\\s+[A-Z][a-zA-Z&]+)*)\\s+${CORP_SUFFIXES}`,
    "i"
  ),
  // "TechCorp is hiring" / "XYZ Corp is looking"
  /\b([A-Z][a-zA-Z&]+(?:\s+[A-Z][a-zA-Z&]+)*)\s+(?:is\s+hiring|is\s+looking|is\s+recruiting|has\s+opening|has\s+vacanc)/i,
  // "Company: TechCorp" / "Company Name: BrightMark"
  /company\s*(?:name)?\s*[:\-–]\s*([A-Z][a-zA-Z&]+(?:\s+[A-Z][a-zA-Z&]+)*)/i,
  // Capitalized word(s) + known suffix — last resort
  new RegExp(`([A-Z][a-zA-Z&]+(?:\\s+[A-Z][a-zA-Z&]+)*)\\s+${CORP_SUFFIXES}\\b`),
];

const STOP_WORDS = new Set([
  "Dear", "Hello", "Hi", "Congratulations", "You", "We", "Our", "The",
  "This", "Your", "Please", "Regards", "Thanks", "Note", "Subject",
  "Team", "HR", "Human", "Resources", "Management", "Department",
  "Greetings", "Sir", "Madam", "Respected",
]);

/**
 * Tries to extract a company name from common patterns in the message text.
 * Returns the name string or null.
 */
function extractCompanyName(text) {
  for (const pat of COMPANY_PATTERNS) {
    const m = pat.exec(text);
    if (m?.[1]) {
      const candidate = m[1].trim();
      const firstWord = candidate.split(/\s+/)[0];
      if (!STOP_WORDS.has(firstWord) && candidate.length >= 3) {
        return candidate;
      }
    }
  }
  return null;
}

// ─── Email Domain Extraction ──────────────────────────────────────────────────

const PERSONAL_DOMAIN_RE =
  /^(gmail|yahoo|outlook|hotmail|rediffmail|ymail|live|zoho|icloud|aol)\./i;

/**
 * Returns the first *non-personal* email domain found in the text, or null.
 *
 * Intentional design: personal domains (Gmail, Yahoo, etc.) are deliberately
 * skipped here because they are already caught by the scanner's `personal_email`
 * rule (rule 2). Returning them here would cause double-flagging with different
 * flag labels for the same signal.
 *
 * The `domain_mismatch` flag (see checkCompany) is therefore only relevant for
 * the less common — but real — scam pattern where a scammer uses a
 * corporate-*looking* but unrelated domain, e.g.:
 *   "Infosys Technologies internship" + contact@infosys-jobs-india.com
 *   "TCS internship" + hr@tcsjobsfreshers.net
 *
 * A genuine company + Gmail gets caught by `personal_email` in scanner.js.
 * A genuine company + fake corporate domain gets caught by `domain_mismatch` here.
 */
function extractEmailDomain(text) {
  const re = /\b[\w.+-]+@([\w.-]+\.[a-z]{2,})\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!PERSONAL_DOMAIN_RE.test(m[1])) return m[1].toLowerCase();
  }
  return null;
}

// ─── Domain–Company Name Similarity ──────────────────────────────────────────

function normalizeStr(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Minimal Levenshtein distance (optimised for short strings ≤ 30 chars). */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  // row-only DP
  let row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = row[j];
      row[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(row[j - 1], row[j], prev);
      prev = temp;
    }
  }
  return row[n];
}

/**
 * Returns true when the email domain plausibly belongs to the named company.
 *
 * Uses THREE strategies in order, but with an important guard:
 * Scammers commonly construct domains like "infosys-careers-india.com" or
 * "tcsjobsfreshers.net" that CONTAIN the company name but are clearly fake.
 * Strategy 4 (suspicious-suffix check) catches these by flagging any domain
 * that contains a company token PLUS known phishing keywords.
 *
 * Strategies:
 *   1. Full-domain (minus TLD) contains the whole normalised company name
 *   2. Per-token: full domain base contains token AND no suspicious extras
 *   3. Levenshtein proximity on short (≤30 char) tokens
 *   4. Acronym match (e.g. "Tata Consultancy Services" → "tcs")
 */
function domainSimilarToCompany(companyName, domain) {
  // Use full domain minus the final TLD segment for matching
  // "infosys-careers-india.com" → "infosys-careers-india" → normalized: "infosyscareers india"
  const parts = domain.split(".");
  const domainBase = normalizeStr(parts.slice(0, -1).join(""));

  const tokens = companyName.split(/\s+/).map(normalizeStr).filter(Boolean);
  const fullNorm = normalizeStr(companyName);

  // Suspicious phishing-domain keywords — common in fake recruitment domains
  const PHISHING_KEYWORDS = [
    "careers", "career", "jobs", "job", "hire", "hiring", "recruit",
    "recruitment", "freshers", "fresher", "apply", "application",
    "india", "official", "portal", "online", "campus", "internship",
    "hrteam", "hrdept",
  ];

  const hasSuspiciousSuffix = PHISHING_KEYWORDS.some((kw) =>
    domainBase.includes(kw)
  );

  // Strategy 1: full name exact match in domain base (e.g. "infosys" domain for Infosys)
  // Only trust this if no suspicious extras are present
  if (!hasSuspiciousSuffix) {
    if (domainBase.includes(fullNorm) || fullNorm.includes(domainBase)) return true;
  }

  // Strategy 2: per-token containment, BUT only if domain doesn't contain the
  // company token AND suspicious phishing keywords — that's the scam pattern
  for (const tok of tokens) {
    if (tok.length < 3) continue;
    const tokenInDomain = domainBase.includes(tok) || tok.includes(domainBase);
    if (tokenInDomain && !hasSuspiciousSuffix) return true;
  }

  // Strategy 3: Levenshtein proximity (typosquatting: "infossy" for Infosys)
  // Compare tokens against the first label only (before first hyphen/digit) for precision
  // Only trust if no phishing keywords are appended
  if (!hasSuspiciousSuffix) {
    const firstLabel = normalizeStr(domain.split(".")[0].split("-")[0]);
    for (const tok of tokens) {
      if (tok.length >= 5 && levenshtein(tok, firstLabel) <= 2) return true;
    }
  }

  // Strategy 4: acronym match (e.g. "Tata Consultancy Services" → "tcs")
  const acronym = tokens.map((t) => t[0] || "").join("");
  if (acronym.length >= 2 && domainBase === acronym) return true;

  return false;
}


// ─── DuckDuckGo Web Presence Check ───────────────────────────────────────────

const DDG_TIMEOUT_MS = 2000;

/**
 * Queries the DuckDuckGo Instant Answer API.
 *
 * Returns:
 *   true  — a verifiable result was returned
 *   false — definitively no results (company unknown to DDG)
 *   null  — network error / CORS block / timeout → caller skips this flag
 */
async function webPresenceCheck(companyName) {
  const q = encodeURIComponent(`${companyName} company official website`);
  const url = `https://api.duckduckgo.com/?q=${q}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DDG_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data = await res.json();

    if (data.AbstractText?.trim()) return true;
    if (data.AbstractURL?.trim()) return true;
    if (Array.isArray(data.RelatedTopics) && data.RelatedTopics.length > 0)
      return true;
    if (data.Redirect?.trim()) return true;

    return false; // definitive empty response
  } catch {
    clearTimeout(timer);
    return null; // timeout, CORS error, network failure → skip gracefully
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Runs company verification checks on the given message text.
 *
 * @param {string} text
 * @returns {Promise<Array<{id,label,weight,detail,description}>>}
 */
export async function checkCompany(text) {
  if (!text?.trim()) return [];

  const flags = [];
  const companyName = extractCompanyName(text);
  const emailDomain = extractEmailDomain(text);

  // ── No identifiable company name ──────────────────────────────────────────
  if (!companyName) {
    flags.push({
      id: "no_company_name",
      label: "No Company Name Identifiable",
      weight: 1,
      detail:
        "The message does not clearly state a company name in a recognizable format.",
      description:
        "Legitimate internship offers always name the company clearly. An anonymous or vague sender is a minor — but real — caution signal.",
    });
    return flags; // Can't run domain / web checks without a name
  }

  // ── Email domain doesn't match company name ───────────────────────────────
  if (emailDomain) {
    const similar = domainSimilarToCompany(companyName, emailDomain);
    if (!similar) {
      flags.push({
        id: "domain_mismatch",
        label: "Email Domain Doesn't Match Company Name",
        weight: 4,
        detail: `Company identified as "${companyName}" but contact email uses "@${emailDomain}", which appears unrelated to the company name.`,
        description:
          "A genuine company's contact email domain should closely match their name. An unrelated domain strongly suggests the email is not from the real organisation.",
      });
    }
  }

  // ── No verifiable web presence ────────────────────────────────────────────
  const presence = await webPresenceCheck(companyName);
  if (presence === false) {
    // Only flag on a definitive empty result — null means network failed → skip
    flags.push({
      id: "no_web_presence",
      label: "Company Presence Not Verifiable Online",
      weight: 1,
      detail: `No verifiable online presence found for "${companyName}". Could not confirm this is a registered company.`,
      description:
        "Real companies — even small startups — typically have some web footprint (website, LinkedIn, news). No findable presence is a cautionary signal, though very new or niche companies may also be absent.",
    });
  }

  return flags;
}

// Named exports for testing / debug
export { extractCompanyName, extractEmailDomain, domainSimilarToCompany };
