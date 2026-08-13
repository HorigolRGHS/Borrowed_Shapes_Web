// app/api/wiki/route.ts
import { NextRequest } from "next/server";
import { forwardJson } from "./_lib/forward";
import { getWikiListParams } from "./_lib/wiki-list-params";

export async function GET(req: NextRequest) {
  return forwardJson(req, "GET", "/wiki", {
    params: getWikiListParams(req.nextUrl.searchParams),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return forwardJson(req, "POST", "/wiki", { body });
}
