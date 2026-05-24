import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const res = await api.get(`/achievements/${id}/users`);
    return NextResponse.json(res);
  } catch (err: any) {
    const backendMessage =
      err.response?.data?.message || err.message;
    return NextResponse.json(
      {
        success: false,
        message: backendMessage,
      },
      {
        status: err.response?.status || 500,
      }
    );
  }
}