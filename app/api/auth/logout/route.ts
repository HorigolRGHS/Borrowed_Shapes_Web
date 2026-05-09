import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";
import { ApiResponse } from "@/models/dtos/api-response.dto";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  let apiRes: ApiResponse<null>;

  try {
    if (!accessToken) throw new Error("No active session");

    const res: ApiResponse<null> = await api.post("/auth/logout", {}, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res || !res.success) throw new Error(res?.message || "Logout failed");
    apiRes = res;
  } catch (err: any) {
    apiRes = {
      statusCode: 200,
      success: true,
      message: err?.response?.data?.message ?? err?.message ?? "Logged out",
      data: null,
      path: "/api/auth/logout",
      timestamp: new Date().toISOString()
    };
  }

  const response = NextResponse.json(apiRes);
  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");

  return response;
}
