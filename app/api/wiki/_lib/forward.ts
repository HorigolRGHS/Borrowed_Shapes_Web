// app/api/wiki/_lib/forward.ts
import { NextRequest, NextResponse } from "next/server";
import axios, { type AxiosResponse } from "axios";
import apiClient from "@/lib/api/api-client";
import type { ApiResponse } from "@/models/dtos/api-response.dto";

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ForwardOptions {
  params?: Record<string, unknown>;
  body?: unknown;
}

export async function forwardJson(
  req: NextRequest,
  method: Method,
  backendPath: string,
  opts: ForwardOptions = {},
): Promise<NextResponse> {
  try {
    const config = {
      params: opts.params,
    };

    let res: AxiosResponse<unknown>;
    switch (method) {
      case "GET":
        res = await apiClient.get(backendPath, config);
        break;
      case "DELETE":
        res = await apiClient.delete(backendPath, config);
        break;
      case "POST":
        res = await apiClient.post(backendPath, opts.body ?? {}, config);
        break;
      case "PUT":
        res = await apiClient.put(backendPath, opts.body ?? {}, config);
        break;
      case "PATCH":
        res = await apiClient.patch(backendPath, opts.body ?? {}, config);
        break;
      default: {
        const _exhaustive: never = method;
        throw new Error(`Unsupported method: ${_exhaustive}`);
      }
    }

    return NextResponse.json(res.data, { status: res.status });
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return NextResponse.json(err.response.data, {
        status: err.response.status,
      });
    }
    const errorRes: ApiResponse<null> = {
      statusCode: 502,
      success: false,
      message: err instanceof Error ? err.message : "Upstream unavailable",
      data: null,
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(errorRes, { status: 502 });
  }
}
