import { NextRequest } from "next/server";
import { forwardJson } from "../../_lib/forward";

export async function GET(req: NextRequest) {
  return forwardJson(req, "GET", "/wiki/admin/stats");
}
