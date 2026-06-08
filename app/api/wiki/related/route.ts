// app/api/wiki/related/route.ts
import { NextRequest } from "next/server";
import { forwardJson } from "../_lib/forward";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return forwardJson(req, "GET", "/wiki/related", {
    params: { slugs: sp.get("slugs") ?? undefined },
  });
}
