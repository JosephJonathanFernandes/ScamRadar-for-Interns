import {
  ShieldAlertIcon,
  InfoIcon,
} from "./icons.jsx";

const THREAT_VECTORS = [
  {
    tier: "CRITICAL THREAT",
    tierClass: "tier-critical",
    title: "Upfront Financial Demands",
    detail: "Demands for registration fees, refundable laptop security deposits, training kit costs, or software license purchases. Legitimate corporate employers bear all onboarding costs and never charge candidates.",
  },
  {
    tier: "CRITICAL THREAT",
    tierClass: "tier-critical",
    title: "Identity & Credential Harvesting",
    detail: "Demanding government identity documents (Aadhaar cards, PAN numbers, bank account numbers, IFSC codes) prior to formal interviews or signed bilateral agreements. This data is exploited for synthetic identity theft and loan fraud.",
  },
  {
    tier: "HIGH ANOMALY",
    tierClass: "tier-high",
    title: "Unverified Communication Channels",
    detail: "Official corporate communication originating from consumer email providers (@gmail.com, @yahoo.com) or recruiters communicating exclusively via WhatsApp or Telegram channels rather than verified corporate domains.",
  },
  {
    tier: "HIGH ANOMALY",
    tierClass: "tier-high",
    title: "Bypassed Vetting & Direct Selection",
    detail: "Offer letters issued with zero technical evaluations, panel interviews, or coding assessments. Scammers rely on instant gratification to disarm student skepticism.",
  },
  {
    tier: "CAUTIONARY SIGNAL",
    tierClass: "tier-caution",
    title: "Coercive Artificial Urgency",
    detail: "Demands such as 'confirm within 2 hours' or 'only 3 slots remaining' designed to trigger panic and prevent candidates from independently cross-verifying the opportunity with their placement cell or company directories.",
  },
  {
    tier: "CAUTIONARY SIGNAL",
    tierClass: "tier-caution",
    title: "Disproportionate Compensation",
    detail: "Promising ₹50,000–₹1,50,000 per month for basic, entry-level data processing or unskilled tasks. Unrealistic stipends serve as psychological bait to lure students into advance-fee schemes.",
  },
];

export default function RedFlagsGuide() {
  return (
    <section className="red-flags-guide" aria-labelledby="taxonomy-heading">
      <div className="guide-header">
        <div className="guide-badge">
          <ShieldAlertIcon size={14} />
          <span>FRAUD TAXONOMY</span>
        </div>
        <h2 id="taxonomy-heading" className="guide-title">
          Internship Threat Vectors & Fraud Signatures
        </h2>
        <p className="guide-subtitle">
          Standardized forensic indicators utilized by ScamRadar to identify deceptive recruitment campaigns.
        </p>
      </div>

      <div className="flags-grid">
        {THREAT_VECTORS.map((v) => (
          <div className="flag-card" key={v.title}>
            <div className="flag-card-header">
              <span className={`flag-tier-badge ${v.tierClass}`}>
                {v.tier}
              </span>
            </div>
            <div className="flag-card-content">
              <h3 className="flag-card-title">{v.title}</h3>
              <p className="flag-card-detail">{v.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="guide-footer-callout">
        <div className="callout-icon-wrap">
          <InfoIcon size={20} />
        </div>
        <div className="callout-content">
          <h4 className="callout-title">Core Candidate Verification Principle</h4>
          <p className="callout-text">
            Never transfer money to secure employment. Independent verification via a company's verified primary domain (e.g. <code>careers.company.com</code>) or verified campus Placement Officer is the authoritative benchmark.
          </p>
        </div>
      </div>
    </section>
  );
}
