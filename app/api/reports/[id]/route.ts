import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await api.get(`/reports/${id}`);
    return NextResponse.json(res);
  } catch (err: any) {
    const backendMessage = err.response?.data?.message || err.message;
    return NextResponse.json(
      { success: false, message: backendMessage },
      { status: err.response?.status || 500 }
    );
  }
}
