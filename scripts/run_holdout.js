import fs from "fs/promises";
import path from "path";
import { checkCompany } from "../src/core/companyCheck.js";
import { analyzeMessage } from "../src/core/scanner.js";

async function runHoldout() {
  const dataPath = path.resolve("./tests/fixtures/holdoutData.json");
  
  const fileContent = await fs.readFile(dataPath, "utf-8");
  const dataset = JSON.parse(fileContent);

  let totalScams = 0;
  let detectedScams = 0;
  const missedScams = [];

  let totalGenuine = 0;
  let falsePositives = 0;
  const fpDetails = [];

  for (const item of dataset) {
    if (item.type === "scam") totalScams++;
    if (item.type === "genuine") totalGenuine++;

    const companyFlags = await checkCompany(item.text);
    const result = analyzeMessage(item.text, companyFlags);

    const isFlagged = result.verdict === "Suspicious" || result.verdict === "Likely Fake";

    if (item.type === "scam") {
      if (isFlagged) {
        detectedScams++;
      } else {
        missedScams.push({
          id: item.id,
          score: result.score,
          flags: result.flags.map(f => f.id)
        });
      }
    } else if (item.type === "genuine") {
      if (isFlagged) {
        falsePositives++;
        fpDetails.push({
          id: item.id,
          score: result.score,
          flags: result.flags.map(f => f.id)
        });
      }
    }
  }

  console.log("\n=========================================");
  console.log("       HOLDOUT DATASET REPORT          ");
  console.log("=========================================\n");

  console.log(`Total Scams Evaluated:   ${totalScams}`);
  console.log(`True Positives (Hits):   ${detectedScams}`);
  console.log(`Hit Rate:                ${Math.round((detectedScams / totalScams) * 100)}%\n`);

  console.log(`Total Genuine Evaluated: ${totalGenuine}`);
  console.log(`False Positives:         ${falsePositives}`);
  console.log(`False Positive Rate:     ${Math.round((falsePositives / totalGenuine) * 100)}%\n`);

  if (missedScams.length > 0) {
    console.log("--- MISSED SCAMS ---");
    missedScams.forEach(m => console.log(`- ${m.id} (Score: ${m.score}), Flags: ${m.flags}`));
  }

  if (fpDetails.length > 0) {
    console.log("--- FALSE POSITIVES ---");
    fpDetails.forEach(fp => console.log(`- ${fp.id} (Score: ${fp.score}), Flags: ${fp.flags}`));
  }
}

runHoldout().catch(console.error);
