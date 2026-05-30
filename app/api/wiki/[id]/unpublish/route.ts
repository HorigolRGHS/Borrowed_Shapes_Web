// app/api/wiki/[id]/unpublish/route.ts
import { NextRequest } from "next/server";
import { forwardJson } from "../../_lib/forward";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardJson(req, "POST", `/wiki/${id}/unpublish`);
}
