import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const res = await api.post("/forums", payload);
    return NextResponse.json(res);
  } catch (err: any) {
    const backendMessage = err.response?.data?.message || err.message;
    return NextResponse.json(
      { success: false, message: backendMessage },
      { status: err.response?.status || 500 }
    );
  }
}