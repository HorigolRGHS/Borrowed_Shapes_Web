import { NextRequest } from "next/server";
import { api } from "@/lib/api/api-client";
import { NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  try {
    const res = await api.get(`/forums/slug/${encodeURIComponent(slug)}`);
    return NextResponse.json(res);
  } catch (err: any) {
    const backendMessage = err.response?.data?.message || err.message;
    return NextResponse.json(
      { success: false, message: backendMessage },
      { status: err.response?.status || 500 }
    );
  }
}