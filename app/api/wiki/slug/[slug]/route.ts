// app/api/wiki/slug/[slug]/route.ts
import { NextRequest } from "next/server";
import { forwardJson } from "../../_lib/forward";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  return forwardJson(req, "GET", `/wiki/slug/${encodeURIComponent(slug)}`);
}
