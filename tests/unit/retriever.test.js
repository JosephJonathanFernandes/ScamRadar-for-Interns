import { describe, it, expect } from "vitest";
import { retrievePrecedents, tokenize } from "../../src/core/rag/retriever.js";

describe("RAG Retriever", () => {
  it("tokenizes and filters stopwords correctly", () => {
    const tokens = tokenize("We are offering a ₹15,000 stipend for Data Entry at admin@nic-internships-india.com");
    expect(tokens).toContain("rs");
    expect(tokens).toContain("15000");
    expect(tokens).toContain("stipend");
    expect(tokens).toContain("data");
    expect(tokens).toContain("entry");
    expect(tokens.some((t) => t.includes("domain_nic"))).toBe(true);
    expect(tokens).not.toContain("are");
    expect(tokens).not.toContain("for");
  });

  it("retrieves fee-based scam precedents for deposit requests", () => {
    const query = "Congratulations! To confirm your data entry intern slot, please transfer ₹500 refundable security deposit.";
    const results = retrievePrecedents(query, { limit: 3 });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe("scam");
    expect(results.some((r) => r.id.includes("deposit") || r.id.includes("fee") || r.id.includes("data_entry"))).toBe(true);
  });

  it("retrieves identity harvesting precedent for Aadhaar/PAN requests", () => {
    const query = "Kindly send your Aadhaar card copy and Bank Account IFSC number to proceed with onboarding.";
    const results = retrievePrecedents(query, { limit: 3 });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === "scam_techera_identity")).toBe(true);
  });

  it("retrieves Google MNC genuine precedent for high stipend offers", () => {
    const query = "We are pleased to offer you the Software Intern role with a stipend of Rs. 1,10,000 per month. Complete portal verification.";
    const results = retrievePrecedents(query, { limit: 3 });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === "gen_high_stipend_mnc" || r.type === "genuine")).toBe(true);
  });

  it("retrieves Telegram task scam precedent for daily like-and-earn jobs", () => {
    const query = "Part time work! Join our Telegram channel and like 3 videos to earn Rs 1000 daily. Immediate payment.";
    const results = retrievePrecedents(query, { limit: 3 });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id.includes("telegram") || r.id.includes("youtube_likes"))).toBe(true);
  });
});
