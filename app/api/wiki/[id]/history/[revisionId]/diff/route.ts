// app/api/wiki/[id]/history/[revisionId]/diff/route.ts
import { NextRequest } from "next/server";
import { forwardJson } from "../../../../_lib/forward";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; revisionId: string }> },
) {
  const { id, revisionId } = await ctx.params;
  return forwardJson(req, "GET", `/wiki/${id}/history/${revisionId}/diff`);
}
