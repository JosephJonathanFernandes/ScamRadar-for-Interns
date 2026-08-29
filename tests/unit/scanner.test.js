import { describe, it, expect } from "vitest";
import { analyzeMessage, RULES } from "../../src/core/scanner.js";
import { checkCompany } from "../../src/core/companyCheck.js";
import { TEST_CASES } from "../fixtures/validationData.js";

describe("Scanner Core Logic", () => {
  describe("Unit Test: payment_request rule", () => {
    const paymentRule = RULES.find((r) => r.id === "payment_request");

    it("flags explicit fee requests", () => {
      const text = "To proceed, please pay Rs 500 as a registration fee.";
      const result = paymentRule.check(text);
      expect(result.triggered).toBe(true);
    });

    it("flags implied security deposits", () => {
      const text = "A refundable security deposit of ₹2000 is required.";
      const result = paymentRule.check(text);
      expect(result.triggered).toBe(true);
    });

    it("does not flag regular salary amounts", () => {
      const text = "You will receive a stipend of Rs 15,000 per month.";
      const result = paymentRule.check(text);
      expect(result.triggered).toBe(false);
    });
  });

  describe("Validation Dataset", () => {
    // We run the full validation dataset through the scanner
    // to ensure the overall hit rate doesn't regress.
    it("maintains 100% hit rate and low FP on the validation dataset", async () => {
      let totalScams = 0;
      let detectedScams = 0;
      let totalGenuine = 0;
      let falsePositives = 0;

      for (const item of TEST_CASES) {
        const isScam =
          item.expectedVerdict === "Suspicious" ||
          item.expectedVerdict === "Likely Fake";

        if (isScam) totalScams++;
        else totalGenuine++;

        const companyFlags = await checkCompany(item.message);
        const result = analyzeMessage(item.message, companyFlags);
        const isFlagged =
          result.verdict === "Suspicious" || result.verdict === "Likely Fake";

        if (isScam && isFlagged) detectedScams++;
        if (!isScam && isFlagged) falsePositives++;
      }

      const hitRate = detectedScams / totalScams;
      const fpRate = falsePositives / totalGenuine;

      expect(hitRate).toBe(1); // 100%
      expect(fpRate).toBeLessThan(0.1); // < 10% false positives
    });
  });
});
