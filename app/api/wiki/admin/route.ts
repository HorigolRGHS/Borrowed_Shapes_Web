// app/api/wiki/admin/route.ts
import { NextRequest } from "next/server";
import { forwardJson } from "../_lib/forward";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return forwardJson(req, "GET", "/wiki/admin", {
    params: {
      page: sp.get("page") ?? undefined,
      limit: sp.get("limit") ?? undefined,
      q: sp.get("q") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      order: sp.get("order") ?? undefined,
    },
  });
}
