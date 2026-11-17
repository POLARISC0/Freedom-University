"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Source } from "@/content/types";
import { linkSourceCitations } from "@/lib/citations";
import type { PublicQuiz, QuizResult } from "@/lib/quiz";
import { Markdown } from "./Markdown";

type SubmitResult = QuizResult & { nextModule: { slug: string; title: string } | null };

const LETTERS = ["A", "B", "C", "D"];

export function QuizRunner({
  professorSlug,
  moduleSlug,
  sources,
}: {
  professorSlug: string;
  moduleSlug: string;
  sources: Source[];
}) {
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [shortAnswer, setShortAnswer] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setShortAnswer("");
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorSlug, moduleSlug }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load the quiz.");
      setQuiz(body);
      setAnswers(body.questions.map(() => null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the quiz.");
    } finally {
      setLoading(false);
    }
  }, [professorSlug, moduleSlug]);

  useEffect(() => {
    // Fetching on mount: the quiz is generated (or resumed) server-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function submit() {
    if (!quiz) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: quiz.attemptId, answers, shortAnswer }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not submit the quiz.");
      setResult(body);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-line bg-surface p-10 text-center text-muted">
        <p className="animate-pulse">The professor is writing your quiz…</p>
        <p className="mt-2 text-xs">This can take up to a minute.</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="space-y-3 rounded-xl border border-line bg-surface p-6">
        <p className="text-danger">{error}</p>
        <button onClick={load} className="rounded-lg border border-line px-4 py-2">Try again</button>
      </div>
    );
  }

  const unanswered = answers.filter((a) => a === null).length;

  return (
    <div className="space-y-6">
      {result && (
        <div
          className={`space-y-3 rounded-xl border p-6 ${result.passed ? "border-success" : "border-danger"} bg-surface`}
        >
          <p className="text-4xl font-semibold tabular-nums">{result.score}%</p>
          <p className="font-medium">
            {result.passed
              ? "Passed! This module is complete."
              : "Not quite. Review the explanations below, revisit the lesson and try a new quiz."}
          </p>
          <p className="text-sm text-muted">
            {result.mcqCorrect}/{quiz.questions.length} multiple choice · {result.shortAnswer.points}/
            {result.shortAnswer.maxPoints} short answer
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {result.nextModule ? (
              <Link
                href={`/classrooms/${professorSlug}/${result.nextModule.slug}`}
                className="rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink"
              >
                Next: {result.nextModule.title} →
              </Link>
            ) : (
              result.passed && (
                <Link href="/dashboard" className="rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink">
                  Back to dashboard
                </Link>
              )
            )}
            <Link href={`/classrooms/${professorSlug}/${moduleSlug}`} className="rounded-lg border border-line px-4 py-2">
              Back to the lesson
            </Link>
            <button onClick={load} className="rounded-lg border border-line px-4 py-2">
              Take a new quiz
            </button>
          </div>
        </div>
      )}

      <ol className="space-y-5">
        {quiz.questions.map((q, qi) => {
          const graded = result?.questions[qi];
          return (
            <li key={qi} className="space-y-3 rounded-xl border border-line bg-surface p-5">
              <p className="font-medium">
                <span className="text-muted">{qi + 1}.</span> {q.question}
              </p>
              <div className="space-y-2" role="radiogroup" aria-label={`Question ${qi + 1}`}>
                {q.options.map((option, oi) => {
                  const chosen = answers[qi] === oi;
                  let style = chosen ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2";
                  if (graded) {
                    if (oi === graded.correctIndex) style = "border-success bg-surface-2";
                    else if (chosen) style = "border-danger";
                    else style = "border-line opacity-70";
                  }
                  return (
                    <button
                      key={oi}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      disabled={!!result}
                      onClick={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left ${style}`}
                    >
                      <span className="font-mono text-sm text-muted">{LETTERS[oi]}</span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
              {graded && (
                <div className="rounded-lg bg-surface-2 p-3 text-sm">
                  <p className={`font-medium ${graded.correct ? "text-success" : "text-danger"}`}>
                    {graded.correct ? "Correct" : graded.chosenIndex === null ? "Not answered" : "Incorrect"}
                  </p>
                  <Markdown>{linkSourceCitations(graded.explanation, sources)}</Markdown>
                </div>
              )}
            </li>
          );
        })}

        <li className="space-y-3 rounded-xl border border-line bg-surface p-5">
          <p className="font-medium">
            <span className="text-muted">{quiz.questions.length + 1}.</span> {quiz.shortAnswer.question}
          </p>
          <textarea
            value={shortAnswer}
            onChange={(e) => setShortAnswer(e.target.value)}
            disabled={!!result}
            rows={5}
            maxLength={3000}
            placeholder="Explain in your own words (2–4 sentences)…"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-brand"
          />
          {result && (
            <div className="space-y-2 rounded-lg bg-surface-2 p-3 text-sm">
              <p className="font-medium">
                {result.shortAnswer.points}/{result.shortAnswer.maxPoints} points
              </p>
              <p>{result.shortAnswer.feedback}</p>
              <details>
                <summary className="cursor-pointer text-muted">Model answer</summary>
                <p className="mt-1">{result.shortAnswer.sampleAnswer}</p>
              </details>
            </div>
          )}
        </li>
      </ol>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!result && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-brand px-5 py-2.5 font-medium text-brand-ink disabled:opacity-60"
          >
            {submitting ? "Grading…" : "Submit quiz"}
          </button>
          {unanswered > 0 && (
            <span className="text-sm text-muted">
              {unanswered} question{unanswered === 1 ? "" : "s"} unanswered
            </span>
          )}
        </div>
      )}
    </div>
  );
}
