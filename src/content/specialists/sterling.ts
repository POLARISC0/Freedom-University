import type { Specialist } from "../types";

export const sterling: Specialist = {
  slug: "sterling",
  name: "Sterling",
  role: "Credit Specialist",
  topic: "Credit",
  emoji: "💳",
  accent: "emerald",
  tagline: "Personal credit, business credit, and the credit-first, corporation-second, funding-third sequence.",
  personality:
    "You are a methodical, encouraging coach who loves checklists and never shames anyone for past mistakes. You teach with clearly hypothetical numbers and you name the exact agencies, forms and consumer rights a student can use.",
  schedule: ["credit-desk", "coffee-bar", "credit-desk", "whiteboard", "news-wall", "credit-desk", "mindset-lounge"],
  lessons: [
    {
      slug: "how-credit-scores-work",
      title: "How Credit Scores Work",
      summary: "What goes into a credit score, the three bureaus, and how to check your reports for free.",
      objectives: [
        "Explain the FICO factor weights: payment history ~35%, amounts owed ~30%, length of history ~15%, new credit ~10%, credit mix ~10%",
        "Name the three national bureaus (Equifax, Experian, TransUnion)",
        "Explain credit utilisation and hard versus soft inquiries",
        "Explain how to get free credit reports at AnnualCreditReport.com",
      ],
      keyTerms: ["FICO score", "credit bureau", "credit report", "utilization", "hard inquiry", "soft inquiry"],
    },
    {
      slug: "building-personal-credit",
      title: "Building and Protecting Personal Credit",
      summary: "Starter tools, good habits, fixing errors and freezing your credit.",
      objectives: [
        "Explain starter tools: secured cards, credit-builder loans and authorized-user status",
        "Explain the habits that move a score most: on-time payments and low utilisation",
        "Explain how to dispute report errors under the Fair Credit Reporting Act",
        "Explain free credit freezes and fraud alerts, and how to spot credit-repair scams",
      ],
      keyTerms: ["secured card", "credit-builder loan", "authorized user", "dispute", "credit freeze", "fraud alert"],
    },
    {
      slug: "the-sequence",
      title: "Credit First, Corporation Second, Funding Third",
      summary: "Why the order matters when you are building toward business ownership.",
      objectives: [
        "Explain why strong personal credit comes first: early business funding usually relies on the owner's credit and a personal guarantee",
        "Explain why the business entity comes second: separating the business before applying for business credit",
        "Explain why funding comes third: lenders want both a credit history and a properly set-up business",
        "Identify the risks of skipping steps, such as high-cost debt or personally guaranteed losses",
      ],
      keyTerms: ["personal guarantee", "business entity", "underwriting", "sequencing", "funding readiness"],
    },
    {
      slug: "business-credit-basics",
      title: "Setting Up a Business for Credit",
      summary: "Entity basics, an EIN, business banking and the business credit bureaus.",
      objectives: [
        "Compare common business structures (sole proprietorship, LLC, corporation) at a high level",
        "Explain the EIN, a dedicated business bank account and consistent business details",
        "Name the business credit bureaus (Dun & Bradstreet, Experian Business, Equifax Business) and the D-U-N-S number",
        "Explain how trade lines such as net-30 vendor accounts build a business credit file",
      ],
      keyTerms: ["LLC", "corporation", "EIN", "D-U-N-S number", "trade line", "net-30", "PAYDEX"],
    },
    {
      slug: "funding-readiness",
      title: "Funding Third: Getting Funding-Ready",
      summary: "Types of business funding, what lenders look at, and how to avoid funding scams.",
      objectives: [
        "Compare business credit cards, lines of credit, term loans and SBA-backed loans",
        "Explain what lenders review: credit, time in business, revenue, debt-to-income and documentation",
        "Explain the risks of personal guarantees and high-cost merchant cash advances",
        "Recognise funding and credit-repair scams that promise guaranteed approvals",
      ],
      keyTerms: ["line of credit", "term loan", "SBA loan", "debt-to-income", "merchant cash advance", "personal guarantee"],
    },
  ],
  sources: [
    { title: "Credit reports and scores", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/" },
    { title: "What's in my FICO Scores?", publisher: "myFICO", url: "https://www.myfico.com/credit-education/whats-in-your-credit-score" },
    { title: "AnnualCreditReport.com (official free credit reports)", publisher: "Equifax, Experian, TransUnion", url: "https://www.annualcreditreport.com" },
    { title: "Credit Freezes and Fraud Alerts", publisher: "US Federal Trade Commission", url: "https://consumer.ftc.gov/articles/what-know-about-credit-freezes-and-fraud-alerts" },
    { title: "Choose a business structure", publisher: "US Small Business Administration", url: "https://www.sba.gov/business-guide/launch-your-business/choose-business-structure" },
    { title: "Apply for an Employer Identification Number (EIN) online", publisher: "Internal Revenue Service", url: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online" },
    { title: "Fund your business", publisher: "US Small Business Administration", url: "https://www.sba.gov/business-guide/plan-your-business/fund-your-business" },
    { title: "D-U-N-S Number", publisher: "Dun & Bradstreet", url: "https://www.dnb.com/duns.html" },
  ],
};
