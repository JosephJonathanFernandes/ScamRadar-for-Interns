export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  // Load API keys (supporting either GROQ_KEY or GROQ_API_KEY)
  const keys = [
    process.env.GROQ_API_KEY_1 || process.env.GROQ_KEY_1,
    process.env.GROQ_API_KEY_2 || process.env.GROQ_KEY_2,
    process.env.GROQ_API_KEY_3 || process.env.GROQ_KEY_3,
    process.env.GROQ_API_KEY_4 || process.env.GROQ_KEY_4,
    process.env.GROQ_API_KEY_5 || process.env.GROQ_KEY_5,
  ].filter(Boolean);

  if (keys.length === 0) {
    console.warn("No Groq API keys found. Failing gracefully.");
    return res.status(200).json({ llmAvailable: false });
  }

  const systemPrompt = `You are a scam-detection assistant for Indian students evaluating WhatsApp-forwarded internship offers.
Analyze the provided message and return ONLY structured JSON, with no markdown formatting or prose.

CRITICAL CALIBRATION RULES:
1. High Stipends: High stipends (e.g., ₹50k-1Lakh+) are normal for top-tier MNCs (Google, Amazon, etc.) and should NOT be flagged as suspicious if the company is legitimate and there are no other red flags.
2. Standard Onboarding: Requesting PAN cards, bank details, or KYC documents is a standard part of onboarding IF the message indicates an interview has already occurred or an offer is being formalized.
3. Government Internships: Government programs (e.g., NITI Aayog, NIC) often have strict, short deadlines and require NOCs/Police verification. This is normal procedure, not artificial urgency.
4. Startup Informality: Extreme informality, conversational language, or using WhatsApp for communication is completely normal for early-stage startups and should be treated as neutral, not suspicious.
5. Campus Programs: Unpaid campus ambassador roles offering merchandise, certificates, or WhatsApp group links are standard marketing programs and usually genuine.

Structure:
{
  "payment_requested": boolean,
  "urgency_tactics": boolean,
  "role_specificity": "vague" | "clear",
  "identity_verifiable": boolean,
  "verdict": "genuine" | "suspicious" | "fake",
  "reasoning": "One or two plain-English sentences a first-year engineering student would understand."
}

EXAMPLES:

Message: "Ministry of IT Internship 2024. Stipend: ₹15,000/month. Only 10 slots available. Send your resume to admin@nic-internships-india.com immediately to apply."
Output:
{
  "payment_requested": false,
  "urgency_tactics": true,
  "role_specificity": "vague",
  "identity_verifiable": false,
  "verdict": "fake",
  "reasoning": "The email domain is fake, and it uses extreme urgency ('immediately to apply') for a supposed government role, which is a classic scam tactic."
}

Message: "We are looking for a marketing intern at Zuddl. This is a paid remote opportunity. If interested, please apply directly on our careers page: zuddl.com/careers"
Output:
{
  "payment_requested": false,
  "urgency_tactics": false,
  "role_specificity": "clear",
  "identity_verifiable": true,
  "verdict": "genuine",
  "reasoning": "The message directs you to a legitimate company careers page without any pressure or suspicious requests."
}

Message: "Hey Rohan, thanks for the chat today! We'd love to offer you the Frontend Developer Internship at PixelCrafters. Stipend will be Rs. 15,000/month. It's a remote role. Since we're a small team, we operate fast. Please let me know if you accept by tomorrow EOD so we can plan next week's sprint. Best, Aman (Founder) pixelcrafters.tech@gmail.com"
Output:
{
  "payment_requested": false,
  "urgency_tactics": true,
  "role_specificity": "clear",
  "identity_verifiable": true,
  "verdict": "genuine",
  "reasoning": "This is an informal but realistic startup offer. The urgency is tied to a legitimate business reason (sprint planning), and there are no suspicious requests for fees or sensitive data."
}

Message: "*URGENT PLACEMENT UPDATE* Infosys has opened an off-campus internship drive for 2025 batch. Role: Systems Engineer Intern Stipend: ₹25,000/month. All interested students must fill the Google Form below by 5 PM TODAY. Do not miss this deadline as the link will close automatically. Form link: https://forms.gle/xyz"
Output:
{
  "payment_requested": false,
  "urgency_tactics": true,
  "role_specificity": "clear",
  "identity_verifiable": true,
  "verdict": "genuine",
  "reasoning": "This is a typical campus placement forwarded message. The urgency and capitalization are common from Training and Placement Officers (TPOs) trying to meet company deadlines, and filling a Google Form is standard procedure without any payment demands."
}

Message: "Congratulations on your selection at Wipro. Please pay the ₹1500 refundable security deposit to receive your offer letter and company laptop."
Output:
{
  "payment_requested": true,
  "urgency_tactics": false,
  "role_specificity": "vague",
  "identity_verifiable": false,
  "verdict": "fake",
  "reasoning": "Legitimate companies like Wipro never ask for security deposits for laptops or offer letters. This is an advance-fee scam."
}
`;

  // Helper function to call Groq with a specific key
  const callGroq = async (apiKey) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

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
            model: "openai/gpt-oss-20b",
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
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return { status: 200, data };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        console.warn("Groq API request timed out.");
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
        return res.status(200).json({ llmAvailable: true, result: parsed });
      } catch (parseError) {
        console.warn("Failed to parse Groq response as JSON:", parseError);
        return res.status(200).json({ llmAvailable: false });
      }
    } else if (result.status === 429 || result.status === 401) {
      console.warn(
        `Key ${i + 1} failed (${result.status}). Trying next key...`
      );
      continue; // Try next key
    } else {
      // 500 or timeout — fail gracefully, no need to burn other keys if API is down
      return res.status(200).json({ llmAvailable: false });
    }
  }

  // If we exhaust all keys
  console.warn("All Groq keys exhausted or invalid.");
  return res.status(200).json({ llmAvailable: false });
}
