import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";
import { ApiResponse } from "@/models/dtos/api-response.dto";

import { ChangePasswordRequest } from "@/models/dtos/auth.dto";

export async function POST(request: NextRequest) {
  try {
    const body: ChangePasswordRequest = await request.json();

    const res: ApiResponse<null> = await api.post("/auth/change-password", body);

    return NextResponse.json(res);

  } catch (err: any) {
    const backendMessage = err.response?.data?.message || err.message;
    return NextResponse.json(
      { success: false, message: backendMessage },
      { status: err.response?.status || 500 }
    );
  }
}
