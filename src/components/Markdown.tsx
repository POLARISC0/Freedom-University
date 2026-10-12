import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders professor and briefing markdown. Raw HTML in the text is not rendered. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="lesson-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Our own pages (a Headmaster's handoff links) stay in this tab; sources open a new one.
          a: ({ href, title, children }) =>
            href && /^\/(?!\/)/.test(href) ? (
              <Link href={href} title={title}>
                {children}
              </Link>
            ) : (
              <a href={href} title={title} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
