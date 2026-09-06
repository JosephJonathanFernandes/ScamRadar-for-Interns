import { retrievePrecedents } from "../core/rag/retriever.js";

/**
 * Dynamically discovers and loads all Groq API keys present in the environment.
 * Supports any number of keys (e.g. GROQ_API_KEY, GROQ_KEY, GROQ_API_KEY_1, GROQ_KEY_2, etc.)
 *
 * @returns {string[]} Ordered array of unique API keys
 */
export function getGroqKeys() {
  // Load .env automatically if Node supports process.loadEnvFile
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile();
    } catch {
      // Ignore if .env is missing or already loaded
    }
  }

  const discovered = new Set();

  // 1. Direct single keys
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
    discovered.add(process.env.GROQ_API_KEY.trim());
  }
  if (process.env.GROQ_KEY && process.env.GROQ_KEY.trim()) {
    discovered.add(process.env.GROQ_KEY.trim());
  }

  // 2. Scan all environment variables matching GROQ_API_KEY_* or GROQ_KEY_*
  const envKeys = Object.keys(process.env).filter((k) =>
    /^GROQ_(?:API_)?KEY(?:_\d+)?$/i.test(k)
  );

  // Sort numerically so _1, _2, _3 maintain intuitive rotation order
  envKeys.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });

  for (const k of envKeys) {
    const val = process.env[k];
    if (val && typeof val === "string" && val.trim().length > 0) {
      discovered.add(val.trim());
    }
  }

  return Array.from(discovered);
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  const keys = getGroqKeys();

  if (keys.length === 0) {
    console.warn("No Groq API keys found. Failing gracefully.");
    return res.status(200).json({ llmAvailable: false });
  }

  // ── RAG Step: Retrieve relevant precedents from verified knowledge base ───
  const retrievedPrecedents = retrievePrecedents(message, { limit: 3 });

  const precedentsContext = retrievedPrecedents
    .map(
      (p, i) =>
        `Precedent ${i + 1} [Type: ${p.type.toUpperCase()} | Category: ${p.category} | Relevance: ${p.score}]\nDescription: ${p.description}\nMessage text: "${p.text}"\nGround Truth: ${p.type === "scam" ? "Scam" : "Genuine Offer"}`
    )
    .join("\n\n");

  const systemPrompt = `You are an expert scam-detection analyst for Indian students evaluating WhatsApp and email forwarded internship offers.
Analyze the provided candidate message by comparing it against the following verified reference precedents retrieved from our knowledge base:

--- RETRIEVED VERIFIED PRECEDENTS ---
${precedentsContext || "No close precedents found."}
-------------------------------------

CRITICAL EVALUATION GUIDELINES:
1. High Stipends: High stipends (₹50k-₹1.5L+) are normal for top-tier MNCs (Google, Amazon, etc.) and should NOT be flagged as suspicious if the company is legitimate, provides standard candidate portals, and has no fee requests.
2. Standard Onboarding: Requesting PAN cards, bank details, or KYC documents is normal IF an interview has already occurred or an offer is being formalized. However, requesting Aadhaar/bank details upfront with NO interview is identity harvesting.
3. Government Programs: Official government schemes (NITI Aayog, NIC) have formal procedures; scammers frequently impersonate them using fake domains or Gmail addresses.
4. Startup Informality: Extreme informality, conversational language, or WhatsApp outreach is normal for early-stage startups as long as no upfront fee is requested.
5. Upfront Fees / Deposits: ANY request for a registration fee, laptop deposit, training kit charge, or software license is an IMMEDIATE scam.

Structure of response: Return ONLY structured JSON, with no markdown formatting or prose.
{
  "payment_requested": boolean,
  "urgency_tactics": boolean,
  "role_specificity": "vague" | "clear",
  "identity_verifiable": boolean,
  "verdict": "genuine" | "suspicious" | "fake",
  "risk_score": number, // Estimated risk percentage 0 (safe) to 100 (definite scam)
  "matched_precedent_id": string, // ID of the most relevant precedent from above
  "reasoning": "One or two plain-English sentences a student can understand explaining the verdict with reference to the precedent."
}`;

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  // Helper function to call Groq with a specific key
  const callGroq = async (apiKey) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Message to analyze: "${message}"` },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.status === 429 || response.status === 401) {
        return { status: response.status };
      }

      if (!response.ok) {
        const errorText = await response.text();
        return {
          status: response.status,
          error: new Error(`Groq API error: ${response.status} - ${errorText}`),
        };
      }

      const data = await response.json();
      return { status: 200, data };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        console.warn("Groq API request timed out after 12s.");
      } else {
        console.warn("Groq API request failed:", error.message);
      }
      return { status: 500, error };
    }
  };

  // Try each key in sequence
  for (let i = 0; i < keys.length; i++) {
    const result = await callGroq(keys[i]);

    if (result.status === 200) {
      try {
        const content = result.data.choices[0].message.content;
        const parsed = JSON.parse(content);
        return res.status(200).json({
          llmAvailable: true,
          result: parsed,
          precedents: retrievedPrecedents,
        });
      } catch (parseError) {
        console.warn("Failed to parse Groq response as JSON:", parseError);
        // JSON parse issue from LLM output — try next key if available
        continue;
      }
    } else if (result.status === 429 || result.status === 401) {
      console.warn(
        `Groq key ${i + 1}/${keys.length} returned ${result.status}. Rotating to next key...`
      );
      continue;
    } else {
      // 500 or timeout — rotate to next key to give other keys/connections a chance
      console.warn(
        `Groq key ${i + 1}/${keys.length} encountered error (${result.status}). Rotating to next key...`
      );
      continue;
    }
  }

  // If we exhaust all keys
  console.warn(`All ${keys.length} Groq key(s) exhausted or failed.`);
  return res.status(200).json({
    llmAvailable: false,
    precedents: retrievedPrecedents,
  });
}
