import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";

export async function GET(request: NextRequest, context: any) {
  const params = await context.params;
  try {
    const res = await api.get(`/forums/id/${params.id}`);
    return NextResponse.json(res);
  } catch (err: any) {
    const backendMessage = err.response?.data?.message || err.message;
    return NextResponse.json(
      { success: false, message: backendMessage },
      { status: err.response?.status || 500 }
    );
  }
}
