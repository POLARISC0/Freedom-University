import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFeed, refreshFeedIfDue } from "@/lib/feed";

/** The floor polls this. Returns current posts at once and generates the next update in the background when due. */
export async function GET() {
  if (!(await getCurrentUser())) return Response.json({ error: "Please sign in." }, { status: 401 });
  after(refreshFeedIfDue);
  return Response.json({ posts: await getFeed() }, { headers: { "Cache-Control": "no-store" } });
}
