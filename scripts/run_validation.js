import fs from "fs/promises";
import path from "path";
import { checkCompany } from "../src/core/companyCheck.js";
import { analyzeMessage } from "../src/core/scanner.js";

async function runValidation() {
  const dataPath = path.resolve("./tests/fixtures/validationData.json");
  
  const fileContent = await fs.readFile(dataPath, "utf-8");
  const dataset = JSON.parse(fileContent);

  let totalScams = 0;
  let detectedScams = 0;
  const missedScams = [];

  let totalGenuine = 0;
  let falsePositives = 0;
  const fpDetails = []; // breakdown of false positives

  for (const item of dataset) {
    if (item.type === "scam") totalScams++;
    if (item.type === "genuine") totalGenuine++;

    // Run the pipeline
    const companyFlags = await checkCompany(item.text);
    const result = analyzeMessage(item.text, companyFlags);

    const isFlagged = result.verdict === "Suspicious" || result.verdict === "Likely Fake";

    if (item.type === "scam") {
      if (isFlagged) {
        detectedScams++;
        console.log(`[SCAM] ${item.id}: Score ${result.score}, Flags: ${result.flags.map(f => f.id).join(", ")}`);
      } else {
        missedScams.push({
          id: item.id,
          description: item.description,
          score: result.score,
          flags: result.flags.map(f => f.id)
        });
      }
    } else if (item.type === "genuine") {
      if (isFlagged) {
        falsePositives++;
        fpDetails.push({
          id: item.id,
          description: item.description,
          score: result.score,
          verdict: result.verdict,
          flags: result.flags.map(f => f.id)
        });
      }
    }
  }

  // Generate Report
  console.log("\n=========================================");
  console.log("       VALIDATION DATASET REPORT       ");
  console.log("=========================================\n");

  console.log(`Total Scams Evaluated:   ${totalScams}`);
  console.log(`True Positives (Hits):   ${detectedScams}`);
  console.log(`Hit Rate:                ${Math.round((detectedScams / totalScams) * 100)}%\n`);

  console.log(`Total Genuine Evaluated: ${totalGenuine}`);
  console.log(`False Positives:         ${falsePositives}`);
  console.log(`False Positive Rate:     ${Math.round((falsePositives / totalGenuine) * 100)}%\n`);

  if (missedScams.length > 0) {
    console.log("--- MISSED SCAMS (False Negatives) ---");
    missedScams.forEach(m => {
      console.log(`- ${m.id} (Score: ${m.score}%)`);
      console.log(`  Desc: ${m.description}`);
      console.log(`  Flags fired: ${m.flags.join(", ") || "None"}\n`);
    });
  }

  if (fpDetails.length > 0) {
    console.log("--- FALSE POSITIVES (Genuine flagged as Suspicious/Fake) ---");
    
    const ruleFrequency = {};
    fpDetails.forEach(fp => {
      console.log(`- ${fp.id} (Verdict: ${fp.verdict}, Score: ${fp.score}%)`);
      console.log(`  Desc: ${fp.description}`);
      console.log(`  Flags fired: ${fp.flags.join(", ")}\n`);
      
      fp.flags.forEach(f => {
        ruleFrequency[f] = (ruleFrequency[f] || 0) + 1;
      });
    });

    console.log("--- FP RULE FREQUENCY BREAKDOWN ---");
    Object.entries(ruleFrequency)
      .sort((a, b) => b[1] - a[1])
      .forEach(([rule, count]) => {
        console.log(`- ${rule}: triggered ${count} times on genuine messages`);
      });
  }
}

runValidation().catch(console.error);
