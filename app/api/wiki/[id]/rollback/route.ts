// app/api/wiki/[id]/rollback/route.ts
import { NextRequest } from "next/server";
import { forwardJson } from "../../_lib/forward";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json();
  return forwardJson(req, "POST", `/wiki/${id}/rollback`, { body });
}
