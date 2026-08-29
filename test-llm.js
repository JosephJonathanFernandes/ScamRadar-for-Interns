// Config loaded via --env-file

import handler from './api/llm-check.js';

// Mess up the first key to test 401 rotation
process.env.GROQ_API_KEY_1 = 'garbage_key_for_testing';

async function testLLM(message) {
  console.log(`\nTesting message: "${message.substring(0, 50)}..."`);
  const req = {
    method: 'POST',
    body: { message }
  };
  
  let statusCode = 200;
  let responseData = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
    }
  };

  await handler(req, res);
  console.log(`Status: ${statusCode}`);
  console.log(`Result:`, JSON.stringify(responseData, null, 2));
}

async function runTests() {
  console.log("=== Test 3: Holdout Scams ===");
  const scams = [
    "Ministry of IT Internship 2024. Stipend: ₹15,000/month. Only 10 slots available. Send your resume to admin@nic-internships-india.com immediately to apply.",
    "Part time online job! Subscribe to our partner Telegram channels and earn ₹1000 daily. No interview. Direct selection. Message us to start.",
    "You are selected for the Graphic Design role. Stipend 30k/month. To begin your remote work, you must purchase the company-licensed Adobe suite for ₹2500 which will be reimbursed in your first salary.",
    "Data Entry Job Work from home. Type captchas and earn cash online easily. Anyone can apply. No experience needed.",
    "Congratulations on your selection at Wipro. Please pay the ₹1500 refundable security deposit to receive your offer letter and company laptop."
  ];

  for (let i = 0; i < scams.length; i++) {
    await testLLM(scams[i]);
  }
}

runTests();
