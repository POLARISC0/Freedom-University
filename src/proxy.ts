import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: bounce visitors without a session cookie to the login
// page. Pages and API routes still validate the session against the database.
export function proxy(request: NextRequest) {
  if (request.cookies.has("fu_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/floor/:path*", "/dashboard/:path*", "/specialists/:path*", "/news/:path*"],
};
