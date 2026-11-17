import type { AnchorHTMLAttributes, ReactNode } from "react";

// The preview's stand-in for `next/link`. The preview is the game alone, so links to the site's other pages are
// left out; anything else opens in a new tab.

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string | null };
  children?: ReactNode;
};

export default function Link(props: LinkProps) {
  const url = typeof props.href === "string" ? props.href : (props.href.pathname ?? "");
  if (url.startsWith("/") && !url.startsWith("//")) return null;
  return (
    <a href={url} className={props.className} title={props.title} aria-label={props["aria-label"]} target="_blank" rel="noopener noreferrer">
      {props.children}
    </a>
  );
}
