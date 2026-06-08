// app/api/wiki/[id]/route.ts
import { NextRequest } from "next/server";
import { forwardJson } from "../_lib/forward";

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json();
  return forwardJson(req, "PUT", `/wiki/${id}`, { body });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return forwardJson(req, "DELETE", `/wiki/${id}`);
}
