import fs from "fs";

const text = "We are hiring interns! Role: Social Media Executive Work: Handle Instagram accounts, reply to DMs, basic Canva design. Stipend: Rs 5,000/month. Walk-in interviews tomorrow at our office in Koramangala. Contact: hello@creativemonkeys.in";

const CORP_SUFFIXES =
  "(?:Pvt\\.?\\s*Ltd\\.?|Ltd\\.?|Inc\\.?|LLC|LLP|" +
  "Technologies|Tech|Solutions|Corp\\.?|Consulting|" +
  "Systems|Services|Group|Foundation|Ventures|" +
  "Analytics|Digital|Studio|Labs|Media|Infotech|Infosystems)";

const COMPANY_PATTERNS = [
  new RegExp(`\\b(?:internship|position|role|opportunity|opening|job)\\s+(?:at|with|in)\\s+([A-Z][a-zA-Z&]+(?:\\s+[A-Z][a-zA-Z&]+)*)`, "i"),
  new RegExp(`\\b(?:at|from|by|with)\\s+([A-Z][a-zA-Z&]+(?:\\s+[A-Z][a-zA-Z&]+)*)\\s+${CORP_SUFFIXES}`, "i"),
  /\b([A-Z][a-zA-Z&]+(?:\s+[A-Z][a-zA-Z&]+)*)\s+(?:is\s+hiring|is\s+looking|is\s+recruiting|has\s+opening|has\s+vacanc)/i,
  /company\s*(?:name)?\s*[:\-–]\s*([A-Z][a-zA-Z&]+(?:\s+[A-Z][a-zA-Z&]+)*)/i,
  new RegExp(`([A-Z][a-zA-Z&]+(?:\\s+[A-Z][a-zA-Z&]+)*)\\s+${CORP_SUFFIXES}\\b`),
];

COMPANY_PATTERNS.forEach((p, i) => console.log(i, p.exec(text)));
