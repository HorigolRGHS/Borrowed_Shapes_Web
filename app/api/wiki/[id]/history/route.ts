// app/api/wiki/[id]/history/route.ts
import { NextRequest } from "next/server";
import { forwardJson } from "../../_lib/forward";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  return forwardJson(req, "GET", `/wiki/${id}/history`, {
    params: {
      page: sp.get("page") ?? undefined,
      limit: sp.get("limit") ?? undefined,
    },
  });
}
