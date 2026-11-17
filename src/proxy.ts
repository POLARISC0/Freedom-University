import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: bounce visitors without a session cookie to the sign-in page. Pages and API routes still
// validate the session against the database.
export function proxy(request: NextRequest) {
  if (request.cookies.has("walk_session")) return NextResponse.next();
  const login = new URL("/walk/begin", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/walk/play/:path*",
    "/walk/journal/:path*",
    "/walk/paths/:path*",
    "/walk/lessons/:path*",
    "/walk/me/:path*",
  ],
};
