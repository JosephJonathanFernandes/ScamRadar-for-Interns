import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getGroqKeys } from "../../src/api/llm-check.js";

describe("Groq API Key Discovery", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear out groq keys from env for test isolation
    for (const k of Object.keys(process.env)) {
      if (/^GROQ_/i.test(k)) {
        delete process.env[k];
      }
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("handles empty environment gracefully", () => {
    const keys = getGroqKeys();
    expect(keys).toEqual([]);
  });

  it("detects single GROQ_API_KEY", () => {
    process.env.GROQ_API_KEY = "single_key_123";
    const keys = getGroqKeys();
    expect(keys).toEqual(["single_key_123"]);
  });

  it("detects exactly 2 keys if only 2 exist in env", () => {
    process.env.GROQ_KEY_1 = "key_one";
    process.env.GROQ_KEY_2 = "key_two";
    const keys = getGroqKeys();
    expect(keys).toEqual(["key_one", "key_two"]);
    expect(keys.length).toBe(2);
  });

  it("sorts indexed keys numerically", () => {
    process.env.GROQ_KEY_10 = "key_ten";
    process.env.GROQ_KEY_2 = "key_two";
    process.env.GROQ_KEY_1 = "key_one";
    const keys = getGroqKeys();
    expect(keys).toEqual(["key_one", "key_two", "key_ten"]);
  });

  it("deduplicates identical keys", () => {
    process.env.GROQ_API_KEY = "dup_key";
    process.env.GROQ_KEY_1 = "dup_key";
    const keys = getGroqKeys();
    expect(keys).toEqual(["dup_key"]);
  });

  it("detects all 4 keys from GROQ_KEY_1 through GROQ_KEY_4 in proper order", () => {
    process.env.GROQ_KEY_1 = "gsk_prod_key_1";
    process.env.GROQ_KEY_2 = "gsk_prod_key_2";
    process.env.GROQ_KEY_3 = "gsk_prod_key_3";
    process.env.GROQ_KEY_4 = "gsk_prod_key_4";
    const keys = getGroqKeys();
    expect(keys.length).toBe(4);
    expect(keys).toEqual([
      "gsk_prod_key_1",
      "gsk_prod_key_2",
      "gsk_prod_key_3",
      "gsk_prod_key_4",
    ]);
  });

  it("rotates sequentially through all 4 keys when previous keys encounter errors", async () => {
    process.env.GROQ_KEY_1 = "key_fail_429";
    process.env.GROQ_KEY_2 = "key_fail_401";
    process.env.GROQ_KEY_3 = "key_fail_500";
    process.env.GROQ_KEY_4 = "key_success";

    const keysTried = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (url, opts) => {
      const authHeader = opts.headers?.Authorization;
      const keyUsed = authHeader.replace("Bearer ", "");
      keysTried.push(keyUsed);

      if (keyUsed === "key_fail_429") {
        return { status: 429, ok: false, text: async () => "Rate limit" };
      }
      if (keyUsed === "key_fail_401") {
        return { status: 401, ok: false, text: async () => "Invalid key" };
      }
      if (keyUsed === "key_fail_500") {
        return { status: 500, ok: false, text: async () => "Internal server error" };
      }
      if (keyUsed === "key_success") {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    verdict: "genuine",
                    risk_score: 5,
                    reasoning: "Success on key 4",
                    payment_requested: false,
                    urgency_tactics: false,
                    role_specificity: "clear",
                    identity_verifiable: true,
                  }),
                },
              },
            ],
          }),
        };
      }
    };

    try {
      const { default: handler } = await import("../../src/api/llm-check.js");
      let statusCode = 200;
      let responseBody = null;
      const req = {
        method: "POST",
        body: { message: "Test offering internship with software company." },
      };
      const res = {
        status: (c) => {
          statusCode = c;
          return res;
        },
        json: (d) => {
          responseBody = d;
        },
      };

      await handler(req, res);

      // Verify that all 4 keys were attempted in exact order
      expect(keysTried).toEqual([
        "key_fail_429",
        "key_fail_401",
        "key_fail_500",
        "key_success",
      ]);
      expect(responseBody.llmAvailable).toBe(true);
      expect(responseBody.result.verdict).toBe("genuine");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
