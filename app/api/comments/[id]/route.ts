import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";

export async function PATCH(request: NextRequest, context: any) {
  const params = await context.params;
  try {
    const payload = await request.json();
    const res = await api.patch(`/comments/${params.id}`, payload);
    return NextResponse.json(res);
  } catch (err: any) {
    const backendMessage = err.response?.data?.message || err.message;
    return NextResponse.json(
      { success: false, message: backendMessage },
      { status: err.response?.status || 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: any) {
  const params = await context.params;
  try {
    const res = await api.delete(`/comments/${params.id}`);
    return NextResponse.json(res);
  } catch (err: any) {
    const backendMessage = err.response?.data?.message || err.message;
    return NextResponse.json(
      { success: false, message: backendMessage },
      { status: err.response?.status || 500 }
    );
  }
}
