import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";
import { ApiResponse } from "@/models/dtos/api-response.dto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res: ApiResponse<any> = await api.post("/auth/reset-password", body);
    return NextResponse.json(res);
  } catch (err: any) {
    const backendMessage = err.response?.data?.message || err.message;
    return NextResponse.json(
      { success: false, message: backendMessage },
      { status: err.response?.status || 500 }
    );
  }
}
