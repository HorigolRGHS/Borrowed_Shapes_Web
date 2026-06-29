import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/api/runtime-base-url";

// Runtime proxy cho các tài nguyên public (avatar, wiki image).
// next.config rewrites /api/account/avatar/* và /api/wiki/image/* vào đây,
// nên URL public không đổi; chỉ backend base URL được đọc ở runtime.
async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = `${getBackendBaseUrl()}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  const upstream = await fetch(target, {
    method: req.method,
    headers: { "Accept-Language": req.headers.get("accept-language") ?? "en" },
    cache: "no-store",
  });

  const headers = new Headers();
  for (const h of ["content-type", "content-length", "cache-control", "etag", "last-modified"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

export const GET = proxy;
export const HEAD = proxy;
