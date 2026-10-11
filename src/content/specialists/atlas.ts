import type { Specialist } from "../types";

export const atlas: Specialist = {
  slug: "atlas",
  name: "Atlas",
  role: "Banking & the System Specialist",
  topic: "Banking & the System",
  emoji: "🏛️",
  accent: "sky",
  tagline: "Central banks, the Treasury, inflation as a hidden tax, how banks profit from debt, and tokenised assets.",
  personality:
    "You are a calm systems thinker who explains the plumbing of money. You are neutral and allergic to conspiracy theories in any direction: you present the strongest version of competing views and separate what an institution actually does from what commentators claim.",
  schedule: ["bank-vault", "news-wall", "news-wall", "bank-vault", "coffee-bar", "whiteboard", "crypto-desk"],
  lessons: [
    {
      slug: "central-banks",
      title: "Central Banks and the Fed",
      summary: "What a central bank does, the Fed's dual mandate, and how interest rates are set.",
      objectives: [
        "Explain the Federal Reserve's dual mandate: maximum employment and stable prices",
        "Explain the FOMC and how the Fed influences short-term interest rates",
        "Explain quantitative easing and quantitative tightening",
        "Explain how rate changes ripple into mortgages, credit cards and savings",
      ],
      keyTerms: ["central bank", "dual mandate", "FOMC", "federal funds rate", "QE", "QT"],
    },
    {
      slug: "the-treasury",
      title: "The Treasury and Government Debt",
      summary: "How the government collects, spends and borrows, and how that differs from the Fed.",
      objectives: [
        "Explain the Treasury's role: collecting revenue, paying the government's bills and issuing debt",
        "Distinguish Treasury bills, notes and bonds",
        "Distinguish fiscal policy (Congress and Treasury) from monetary policy (the Fed)",
        "Explain deficits, the national debt and the debt ceiling",
      ],
      keyTerms: ["Treasury", "T-bill", "Treasury note", "Treasury bond", "deficit", "national debt", "debt ceiling"],
    },
    {
      slug: "inflation-hidden-tax",
      title: "Inflation as a Hidden Tax",
      summary: "How inflation is measured, why economists call it a tax, and who gains and loses.",
      objectives: [
        "Explain how inflation is measured with the Consumer Price Index",
        "Explain the economic idea of an 'inflation tax': rising prices reduce the purchasing power of cash and fixed incomes without a vote on a new tax",
        "Explain who tends to lose (savers in cash, fixed incomes) and who can gain (borrowers with fixed-rate debt, governments with large debts)",
        "Explain why central banks target low, stable inflation (around 2% in the US) and the arguments for and against",
      ],
      keyTerms: ["inflation", "CPI", "purchasing power", "inflation tax", "real return", "fixed-rate debt"],
    },
    {
      slug: "banks-profit-from-debt",
      title: "How Banks Profit from Debt",
      summary: "Net interest margin, how lending creates deposits, and why consumer debt is profitable.",
      objectives: [
        "Explain net interest margin: the gap between what banks earn on loans and pay on deposits",
        "Explain how bank lending creates new deposits",
        "Explain why credit cards are among the most profitable bank products (high APRs, fees)",
        "Explain FDIC deposit insurance and what it covers",
      ],
      keyTerms: ["net interest margin", "deposit", "loan", "APR", "interchange fee", "FDIC insurance"],
    },
    {
      slug: "tokenised-assets",
      title: "The Shift to Tokenised Assets",
      summary: "Tokenised Treasuries and funds, deposit tokens, stablecoins, and the CBDC debate.",
      objectives: [
        "Explain real-world asset tokenisation and its claimed benefits: faster settlement, 24/7 markets, programmability",
        "Describe tokenised Treasury and money-market funds offered by large asset managers",
        "Distinguish bank deposit tokens, stablecoins and central bank digital currencies",
        "Summarise the US stance on a retail CBDC, including the January 2025 executive order",
        "Weigh the risks: legal enforceability, smart-contract failure, concentration",
      ],
      keyTerms: ["tokenisation", "real-world assets", "tokenised fund", "deposit token", "stablecoin", "CBDC"],
    },
  ],
  sources: [
    { title: "The Fed Explained", publisher: "Board of Governors of the Federal Reserve System", url: "https://www.federalreserve.gov/aboutthefed/the-fed-explained.htm" },
    { title: "US Department of the Treasury", publisher: "US Treasury", url: "https://home.treasury.gov/" },
    { title: "America's Finance Guide: National Debt", publisher: "US Treasury Fiscal Data", url: "https://fiscaldata.treasury.gov/americas-finance-guide/national-debt/" },
    { title: "Consumer Price Index", publisher: "US Bureau of Labor Statistics", url: "https://www.bls.gov/cpi/" },
    { title: "Net Interest Margin for all U.S. Banks (USNIM)", publisher: "Federal Reserve Bank of St. Louis (FRED)", url: "https://fred.stlouisfed.org/series/USNIM" },
    { title: "Deposit Insurance", publisher: "Federal Deposit Insurance Corporation", url: "https://www.fdic.gov/resources/deposit-insurance/" },
    { title: "Money and Payments: The U.S. Dollar in the Age of Digital Transformation (January 2022)", publisher: "Federal Reserve Board", url: "https://www.federalreserve.gov/publications/money-and-payments-discussion-paper.htm" },
    { title: "Bank for International Settlements: tokenisation and CBDC research", publisher: "BIS", url: "https://www.bis.org/" },
    { title: "Executive Order 14178, Strengthening American Leadership in Digital Financial Technology (January 23, 2025)", publisher: "Federal Register" },
    { title: "GENIUS Act (S.1582, 119th Congress)", publisher: "Congress.gov", url: "https://www.congress.gov/bill/119th-congress/senate-bill/1582" },
  ],
};
