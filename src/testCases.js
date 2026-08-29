/**
 * testCases.js — 15 traced test cases for the ScamRadar for Interns rule-based scanner.
 *
 * Each case was manually traced against the 7 RULES in scanner.js to ensure
 * the expectedVerdict is correct.  The test runner calls analyzeMessage()
 * synchronously WITHOUT company flags — it validates the core 7 rules only.
 *
 * Categories:
 *   SCAM      (5) — multiple obvious red flags, clearly Likely Fake
 *   GENUINE   (5) — zero red flags, clearly Likely Genuine
 *   BORDERLINE(5) — subtle: indirect payment, tight-but-real deadlines,
 *                   non-native phrasing, polished-scam with missing keywords
 */

export const TEST_CASES = [
  // ════════════════════════════════════════════════════════════
  // OBVIOUS SCAMS
  // ════════════════════════════════════════════════════════════
  {
    id: "scam-1",
    category: "Obvious Scam",
    description: "All 7 flags — registration fee, personal email, urgency, direct selection, data entry, ₹65k stipend, Aadhaar",
    expectedVerdict: "Likely Fake",
    message: `Congratulations! You have been selected for a work-from-home data entry internship at ABC Corp. Registration fee of ₹499 is required (refundable). Reply within 2 hours to confirm your slot. No interview needed — direct selection only. Contact HR at hr@gmail.com. Stipend: ₹65,000 per month. Please send your Aadhaar number to get started.`,
  },
  {
    id: "scam-2",
    category: "Obvious Scam",
    description: "Training kit charge + WhatsApp interview + pre-selected + easy WFH + limited seats",
    expectedVerdict: "Likely Fake",
    message: `Dear Candidate, We are pleased to offer you an internship at XYZ Solutions. You have been pre-selected based on your resume. A training kit charge of Rs 800 is required before onboarding. Interview process: WhatsApp interview only — no face-to-face round needed. This is easy work from home. Limited seats available — apply now!`,
  },
  {
    id: "scam-3",
    category: "Obvious Scam",
    description: "High stipend (₹75k) + Yahoo email + no experience/anyone can apply + direct selection + hurry urgency",
    expectedVerdict: "Likely Fake",
    message: `Hi! Amazing opportunity for freshers. Work from home as a Social Media Executive Intern and earn Rs 75,000 per month! No experience required. Anyone can apply. Direct selection — shortlisted directly from your profile. Contact: jobs2024@yahoo.com. Hurry up, slots are filling fast!`,
  },
  {
    id: "scam-4",
    category: "Obvious Scam",
    description: "Joining fee + security deposit + PAN card + bank account + IFSC before offer",
    expectedVerdict: "Likely Fake",
    message: `You have been selected for a remote internship position. To confirm your enrollment, a joining fee of ₹1,000 is required as a refundable security deposit. Before your first day, please share your PAN card details and bank account number with IFSC code for payroll registration.`,
  },
  {
    id: "scam-5",
    category: "Obvious Scam",
    description: "Copy-paste job + enrollment fee Rs 299 + URGENT HIRING + offer expires today",
    expectedVerdict: "Likely Fake",
    message: `URGENT HIRING! Copy paste job available, work from home. No skills required. Earn Rs 500 per hour. Offer expires today. Start by paying a small enrollment fee of Rs 299 to receive your task kit. Contact us on WhatsApp only.`,
  },

  // ════════════════════════════════════════════════════════════
  // GENUINE MESSAGES
  // ════════════════════════════════════════════════════════════
  {
    id: "genuine-1",
    category: "Genuine",
    description: "Formal Infosys offer letter — company domain email, Zoom interview, ₹15k stipend",
    expectedVerdict: "No Red Flags Found",
    message: `Dear Applicant,

Thank you for applying for the Software Engineering Intern position at Infosys Technologies Ltd. You have been shortlisted for the next round of interviews.

Interview Details:
- Round 1: Technical Interview via Zoom (45 minutes)
- Date: September 5, 2024 at 10:00 AM IST

Stipend: ₹15,000 per month
Duration: 3 months | Location: Bengaluru / Remote

For queries, contact: recruitment@infosys.com

Regards,
Talent Acquisition Team, Infosys Technologies Ltd`,
  },
  {
    id: "genuine-2",
    category: "Genuine",
    description: "Small startup Pixel Studio — company domain, 2-round interview, ₹12k stipend, specific role, no rush",
    expectedVerdict: "No Red Flags Found",
    message: `Hi Priya,

We found your profile on LinkedIn and would love to invite you to interview for a UI/UX Design Intern role at Pixel Studio.

This is a 3-month paid internship (₹12,000/month) with real project work — you'd be redesigning an e-commerce client's product pages.

Interview process: 2 rounds — portfolio review call + a short design task.

Please reply by September 10 if interested. No rush, we just want to close this before our project starts.

— Arun, Co-founder | hr@pixelstudio.in`,
  },
  {
    id: "genuine-3",
    category: "Genuine",
    description: "EduSpark EdTech — company email, cleared 2-round selection, ₹8k stipend, specific deliverables, no fees",
    expectedVerdict: "No Red Flags Found",
    message: `Subject: Internship Offer — Content Research Intern | EduSpark Learning

Dear Candidate,

We are thrilled to extend an offer for the Content Research Intern role at EduSpark Learning Pvt Ltd.

Role: Research and draft curriculum outlines for our K-12 science courses, working closely with our academic team.

Compensation: ₹8,000/month | Duration: 6 months (with PPO possibility)

You have successfully cleared our 2-round selection process (aptitude test + HR discussion). No fees or deposits are required at any stage.

Contact: careers@eduspark.in`,
  },
  {
    id: "genuine-4",
    category: "Genuine",
    description: "FinEdge Capital — interview already done, company email, ₹20k stipend, hybrid role, formal offer letter",
    expectedVerdict: "No Red Flags Found",
    message: `Hi Rahul,

Following your interview last week with our team at FinEdge Capital, we'd like to formally invite you to join us as a Financial Research Intern.

Start Date: October 1, 2024 | Stipend: ₹20,000/month | Duration: 4 months
Work Mode: Hybrid (2 days in our Noida office)

You will work on equity research reports for our mid-cap portfolio. A formal offer letter will be sent to your registered email within 48 hours.

For any questions: internships@finedgecapital.com

Best,
Shreya Mehta — HR Manager, FinEdge Capital Pvt Ltd`,
  },
  {
    id: "genuine-5",
    category: "Genuine",
    description: "GreenRoots NGO — org domain email, unpaid volunteer with certificate, onboarding call scheduled",
    expectedVerdict: "No Red Flags Found",
    message: `Dear Applicant,

We are happy to confirm your selection for the Social Media & Communications Intern position at GreenRoots Foundation.

This is an unpaid volunteer internship (remote, 15 hrs/week) focused on environmental awareness content.

You will receive a completion certificate and a letter of recommendation from our Programme Director.

Onboarding call is scheduled for September 2, 2024 at 4:00 PM IST. Please confirm availability by replying to this email.

Contact: team@greenrootsfoundation.org
Meera Sharma — Programme Coordinator, GreenRoots Foundation`,
  },

  // ════════════════════════════════════════════════════════════
  // BORDERLINE / SUBTLE CASES
  // ════════════════════════════════════════════════════════════
  {
    id: "border-1",
    category: "Borderline",
    description: "Genuinely hedged payment hint ('a nominal admin charge *may* apply') — vague enough that the payment rule should NOT fire. But Gmail + vague WFH → 2 flags → Suspicious. Tests that the scanner doesn't over-flag truly ambiguous hints.",
    expectedVerdict: "Suspicious",
    message: `Hi! You've been shortlisted for our Digital Marketing Intern role at BrightMark Agency. This is a work-from-home opportunity — no experience required. Our team will train you from scratch. Stipend: Rs. 10,000/month, flexible hours. Note: a nominal admin charge may apply for certain onboarding formalities, handled through our third-party HR partner — details shared after selection. Reach out at hr.brightmark2024@gmail.com to get started!`,
  },

  {
    id: "border-2",
    category: "Borderline",
    description: "Legitimate startup with tight but contextually explained deadline, unusual domain, specific role — should pass as Genuine",
    expectedVerdict: "No Red Flags Found",
    message: `Hey! Thanks for applying to Zap Logistics.

Quick background: we're a 3-year-old last-mile delivery startup based in Pune. We're growing fast and need a Growth & Operations Intern — our current intern finishes next week and we need someone in by the 1st.

Role: tracking deliveries, coordinating with delivery partners, building Excel dashboards.
Stipend: ₹10,000/month, fully remote.

Interview: 20-minute call on Google Meet — please share your availability.

— Tanvir, Ops Lead | ops@zap-logistics.co`,
  },
  {
    id: "border-3",
    category: "Borderline",
    description: "Scam with indirect wording — 'refundable deposit' hidden in verification language + hotmail + 'Apply now' urgency",
    expectedVerdict: "Likely Fake",
    message: `We are running a Campus Ambassador Program! Selected students will represent top brands at their college and earn monthly incentives of ₹3,000–₹8,000. This is a work from home opportunity, just 2–3 hours a day. No skills needed.

For identity verification, a refundable deposit of ₹150 is collected via UPI once your profile is reviewed.

Apply now — limited time offer! Contact: campus.program@hotmail.com`,
  },
  {
    id: "border-4",
    category: "Borderline",
    description: "Legitimate but non-native phrasing ('urgent requirement', 'as soon as possible') — should NOT falsely trigger urgency rule",
    expectedVerdict: "No Red Flags Found",
    message: `Dear Student,

Our company TechMinds Solutions has urgent requirement for intern in web development department. We saw your profile and it looks matching for our team.

Work will involve building websites for clients using HTML, CSS, and React. Stipend will be discussed in interview — typically Rs 6,000 to Rs 8,000 per month for freshers.

Interview will be taken on video call. Please reply to this email if you are interested.

info@techminds-solutions.com
HR Department, TechMinds Solutions`,
  },
  {
    id: "border-5",
    category: "Borderline",
    description: "Polished scam — no payment, no personal email, no urgency, but 'No interview required' + 'No experience required' + WhatsApp only contact",
    expectedVerdict: "Suspicious",
    message: `Hi,

I'm reaching out from TalentLink HR Consultancy on behalf of a client in the FMCG industry.

They are looking for a Market Research Intern for a 2-month remote project. No experience required — good communication and a smartphone is all you need.

Stipend: ₹22,000/month.
Selection: No interview required — candidates are shortlisted directly based on profile review.

If you're interested, please WhatsApp us to receive the full job description and next steps.

Regards,
TalentLink Recruitment Team`,
  },
];
