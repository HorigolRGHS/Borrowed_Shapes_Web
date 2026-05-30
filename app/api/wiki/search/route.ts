// app/api/wiki/search/route.ts
import { NextRequest } from "next/server";
import { forwardJson } from "../_lib/forward";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return forwardJson(req, "GET", "/wiki/search", {
    params: {
      q: sp.get("q") ?? undefined,
      page: sp.get("page") ?? undefined,
      limit: sp.get("limit") ?? undefined,
    },
  });
}
