import React from "react";

const flags = [
  {
    icon: "💸",
    title: "Upfront Payment Requests",
    body: "Any request for money before you start — registration fees, security deposits, training kit charges — is a scam. Legitimate internships pay you, not the other way around.",
  },
  {
    icon: "📧",
    title: "Personal Email Addresses",
    body: "Real companies use their own domain (e.g. hr@company.com). If the contact is from Gmail, Yahoo, or Outlook, be very suspicious.",
  },
  {
    icon: "⏰",
    title: "Artificial Urgency",
    body: '"Reply within 2 hours", "limited seats", "offer valid only today" — these are pressure tactics to stop you from verifying the company\'s legitimacy.',
  },
  {
    icon: "🚫",
    title: "No Real Interview",
    body: "\"Direct selection\", \"WhatsApp interview only\", or \"no interview required\" means there\'s no vetting process — a hallmark of fake offers.",
  },
  {
    icon: "📋",
    title: "Vague Job Descriptions",
    body: '"Easy work from home", "data entry / copy-paste job", "no skills required" — real internships have specific responsibilities and learnings.',
  },
  {
    icon: "💰",
    title: "Unrealistically High Pay",
    body: "₹50,000+ per month for a fresher/intern role is extremely unlikely. High pay is used as bait — real stipends are typically ₹5,000–₹20,000.",
  },
  {
    icon: "🆔",
    title: "Sensitive Info Requests",
    body: "Asking for Aadhaar, PAN, bank account numbers, or IFSC codes before even issuing an offer letter is a serious red flag — this data can be used for financial fraud.",
  },
];

export default function RedFlagsGuide() {
  return (
    <section className="red-flags-guide" aria-labelledby="red-flags-title">
      <div className="guide-header">
        <h2 id="red-flags-title">
          <span className="guide-icon">🚩</span>
          Common Internship Scam Tactics
        </h2>
        <p className="guide-subtitle">
          Know these patterns to protect yourself — whether or not you use the
          checker above.
        </p>
      </div>
      <div className="flags-grid">
        {flags.map((f) => (
          <div className="flag-card" key={f.title}>
            <div className="flag-card-icon" aria-hidden="true">
              {f.icon}
            </div>
            <div className="flag-card-content">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="guide-footer">
        <p>
          💡 <strong>Golden Rule:</strong> When in doubt, look up the company
          directly on LinkedIn or their official website. Never pay anyone to
          get a job.
        </p>
      </div>
    </section>
  );
}
