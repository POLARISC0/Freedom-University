import type { Specialist } from "../types";

export const sage: Specialist = {
  slug: "sage",
  name: "Sage",
  role: "Mindset & Ownership Specialist",
  topic: "Mindset & Ownership",
  emoji: "🌱",
  accent: "violet",
  tagline: "From consumer to owner: moving from paycheck to assets, one habit at a time.",
  personality:
    "You are a warm, grounded mentor. You ask reflective questions, celebrate small wins and favour slow, boring progress over get-rich-quick stories. You use simple balance-sheet thinking and clearly hypothetical examples.",
  schedule: ["mindset-lounge", "coffee-bar", "mindset-lounge", "whiteboard", "news-wall", "mindset-lounge", "credit-desk"],
  lessons: [
    {
      slug: "consumer-vs-owner",
      title: "Consumer Mindset vs Ownership Mindset",
      summary: "Where your money flows, and the difference between buying things and owning assets.",
      objectives: [
        "Explain the difference between an asset (puts money in your pocket over time) and a liability or expense",
        "Describe consumer habits such as lifestyle inflation and buying on credit",
        "Describe ownership habits: paying yourself first and acquiring income-producing assets",
        "Reflect on your own money story without judgement",
      ],
      keyTerms: ["asset", "liability", "lifestyle inflation", "net worth", "ownership mindset"],
    },
    {
      slug: "paycheck-to-cash-flow",
      title: "From Paycheck to Cash Flow",
      summary: "Tracking cash flow, paying yourself first and building an emergency fund.",
      objectives: [
        "Calculate monthly cash flow from income and expenses",
        "Explain 'pay yourself first' and automating savings",
        "Explain an emergency fund and the common 3-6 months of expenses guideline",
        "Compare simple budgeting methods such as 50/30/20 and zero-based budgeting",
      ],
      keyTerms: ["cash flow", "pay yourself first", "emergency fund", "50/30/20", "zero-based budget"],
    },
    {
      slug: "what-counts-as-an-asset",
      title: "What Counts as an Asset",
      summary: "Income-producing assets versus things that lose value, and building a personal balance sheet.",
      objectives: [
        "Distinguish appreciating or income-producing assets from depreciating purchases",
        "Describe common asset types: index funds, businesses, real estate, intellectual property, and volatile assets like crypto",
        "Build a simple personal balance sheet and calculate net worth",
        "Explain why diversification matters",
      ],
      keyTerms: ["income-producing asset", "depreciation", "balance sheet", "net worth", "index fund", "diversification"],
    },
    {
      slug: "first-ownership-steps",
      title: "Your First Ownership Steps",
      summary: "Compounding, automation, retirement accounts and small business ideas, as frameworks.",
      objectives: [
        "Explain compound growth and the rule of 72",
        "Explain dollar-cost averaging and automation as habits",
        "Describe tax-advantaged retirement accounts at a high level (401(k), IRA, Roth IRA)",
        "Describe ways people build ownership through skills, side businesses and equity",
      ],
      keyTerms: ["compound growth", "rule of 72", "dollar-cost averaging", "401(k)", "Roth IRA", "equity"],
    },
    {
      slug: "the-long-game",
      title: "Playing the Long Game",
      summary: "Habits, patience, risk management and writing a personal ownership plan.",
      objectives: [
        "Explain delayed gratification and why time is an owner's biggest advantage",
        "Recognise get-rich-quick and 'guaranteed returns' red flags",
        "Explain basic risk management: emergency fund, insurance, avoiding concentration",
        "Outline a personal ownership plan with goals and a review cadence (as education, not advice)",
      ],
      keyTerms: ["delayed gratification", "time horizon", "risk management", "scam red flags", "ownership plan"],
    },
  ],
  sources: [
    { title: "Compound Interest Calculator", publisher: "Investor.gov (US SEC)", url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator" },
    { title: "Asset Allocation", publisher: "Investor.gov (US SEC)", url: "https://www.investor.gov/introduction-investing/getting-started/asset-allocation" },
    { title: "Economic Well-Being of U.S. Households (SHED)", publisher: "Federal Reserve Board", url: "https://www.federalreserve.gov/consumerscommunities/shed.htm" },
    { title: "Consumer tools", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/consumer-tools/" },
    { title: "Retirement Plans", publisher: "Internal Revenue Service", url: "https://www.irs.gov/retirement-plans" },
    { title: "Dollar cost averaging", publisher: "Bogleheads Wiki", url: "https://www.bogleheads.org/wiki/Dollar_cost_averaging" },
    { title: "What To Know About Cryptocurrency and Scams", publisher: "US Federal Trade Commission", url: "https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams" },
  ],
};
