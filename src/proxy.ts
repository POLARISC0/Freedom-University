import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: bounce visitors without a session cookie to a sign-in page. Pages and API routes still
// validate the session against the database.
export function proxy(request: NextRequest) {
  if (request.cookies.has("fu_session")) return NextResponse.next();
  const { pathname } = request.nextUrl;
  const login = new URL(pathname.startsWith("/walk") ? "/walk/begin" : "/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/classrooms/:path*",
    "/news/:path*",
    "/walk/play/:path*",
    "/walk/journal/:path*",
    "/walk/paths/:path*",
    "/walk/lessons/:path*",
    "/walk/me/:path*",
  ],
};
