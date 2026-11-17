import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders professor and briefing markdown. Raw HTML in the text is not rendered. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="lesson-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, title, children }) => (
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
