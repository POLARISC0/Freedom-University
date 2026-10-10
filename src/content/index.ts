import { altcoinsCycles } from "./professors/altcoins-cycles";
import { bankingSystem } from "./professors/banking-system";
import { bitcoinEthereum } from "./professors/bitcoin-ethereum";
import { creditPersonalFinance } from "./professors/credit-personal-finance";
import { investingBasics } from "./professors/investing-basics";
import type { CourseModule, Professor } from "./types";

export const PROFESSORS: Professor[] = [
  bitcoinEthereum,
  altcoinsCycles,
  bankingSystem,
  creditPersonalFinance,
  investingBasics,
];

/** Professor 3 writes the daily news briefing. */
export const NEWS_PROFESSOR = bankingSystem;

export function getProfessor(slug: string): Professor | undefined {
  return PROFESSORS.find((p) => p.slug === slug);
}

export function getModule(
  professorSlug: string,
  moduleSlug: string,
): { professor: Professor; module: CourseModule; index: number } | undefined {
  const professor = getProfessor(professorSlug);
  if (!professor) return undefined;
  const index = professor.modules.findIndex((m) => m.slug === moduleSlug);
  if (index === -1) return undefined;
  return { professor, module: professor.modules[index], index };
}

export type { CourseModule, Professor, Source, Level } from "./types";
