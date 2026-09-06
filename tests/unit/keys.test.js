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
});
