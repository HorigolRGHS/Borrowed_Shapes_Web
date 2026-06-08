// app/api/wiki/admin/[id]/route.ts
import { NextRequest } from "next/server";
import { forwardJson } from "../../_lib/forward";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardJson(req, "GET", `/wiki/admin/${id}`);
}
