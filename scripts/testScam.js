import { analyzeMessage } from "../src/core/scanner.js";
import { checkCompany } from "../src/core/companyCheck.js";
import llmCheck from "../src/api/llm-check.js";
const rawText = `[29/08, 6:42 pm] Noah: *ATTENTION  STUDENTS*🎓
Workshop along with the Internship Campaign

*There's this Campaign that's been Running in our school and mostly everyone has registered for it.*

🛑 *LAST PRIME BATCH* 
*Apply Now* 
*https://tinyurl.com/Training-and-Internship-Drive*

Companies are here to offer Courses & Internship opportunities across various fields.

From *Artificial Intelligence, Data Structure and Algorithm, Entrepreneurship,Psychology , Financial Analysis,Creative Writing, UI/UX Design Freelance Content Writing, Social Media Content Creation,Digital Marketing, Advertisement and Branding, Entrepreneurship etc from the top professionals of EY ,Deloitte, IBM, LTI ,S&P GLOBAL,KPMG, MasterCard & Many more* .

PS : STUDENTS CAN CHOOSE WHICHEVER MONTH THEY WANT

*CHECK OUT FOR REFERENCE ⬇*
*Instagram* -https://www.instagram.com/skilllevel.in?igsh=MzRlODBiNWFlZA==
*LinkedIn-* https://www.linkedin.com/company/skill-level/
[29/08, 6:43 pm] Noah: https://tinyurl.com/Training-and-Internship-Drive
📌 It's mandatory to add your name after registering.
[... long name list ...]
[29/08, 6:43 pm] Noah: Hey Guys,
There are *only 5 seats* allotted for our class. The campaign in other departments is already over, and now it's our chance.
*The campaign will be closed by 04:30PM today*, so make sure you take this seriously and don't miss the opportunity.

📌 Whoever wants a call on priority, kindly fill out this form again: *https://tinyurl.com/Training-and-Internship-Drive*
[29/08, 6:43 pm] Noah: Congratulations to Sujal Zoro for successfully enrolling for SkillLevel Training & Internship Opportunity program🧑🎓. There are many of us who are looking forward to enrol can fill the form asap .🎓*KINDLY FILL OUT THE FORM AGAIN TO GET A PRIORITY CALL 🚀.

APPLY NOW: https://tinyurl.com/Training-and-Internship-Drive
[... repeated "Congratulations to X" messages for multiple names ...]
[29/08, 6:43 pm] Noah: +917619155600 that's the number
[29/08, 6:43 pm] Noah: She called on that`;

async function run() {
  const companyFlags = await checkCompany(rawText);
  const ruleResult = analyzeMessage(rawText, companyFlags);
  
  console.log("=== RULE ENGINE RESULT ===");
  console.log("Verdict:", ruleResult.verdict);
  console.log("Score:", ruleResult.score);
  console.log("Flags:", ruleResult.flags.map(f => f.id).join(", "));
  
  console.log("\\n=== SENDING TO LLM ===");
  
  const req = { method: "POST", body: { message: rawText, companyName: "SkillLevel" } };
  const res = {
    status: (code) => { res.statusCode = code; return res; },
    json: (data) => {
      console.log("LLM Status Code:", res.statusCode || 200);
      console.log("LLM Response:", data);
    }
  };
  
  try {
    await llmCheck(req, res);
  } catch (err) {
    console.error("LLM Error:", err);
  }
}

run();
