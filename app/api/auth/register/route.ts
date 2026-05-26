import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import { RegisterRequest, RegisterResponse } from "@/models/dtos/auth.dto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 1. Chỉ lấy đúng các trường Backend cần, loại bỏ confirmPassword, platform, v.v.
    const payload: RegisterRequest = {
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      deviceInfo: body.deviceInfo
    };

    // 2. Tự động lấy Device Info từ User-Agent nếu chưa có
    const userAgent = request.headers.get("user-agent") || "Web Browser";
    if (!payload.deviceInfo) {
      payload.deviceInfo = userAgent;
    }

    // 3. Gọi sang Backend NestJS
    const res: ApiResponse<RegisterResponse> = await api.post("/auth/register", payload);

    if (!res) throw new Error("Empty response from server");

    // Trả về kết quả cho frontend (không có cookie vì register chưa log in)
    return NextResponse.json(res);

  } catch (err: any) {
    const errorRes: ApiResponse<null> = {
      statusCode: err?.response?.status || 400,
      success: false,
      message: err?.response?.data?.message ?? err?.message ?? "Registration failed",
      data: null,
      path: "/api/auth/register",
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(errorRes, { status: errorRes.statusCode });
  }
}
