import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_SECRET = process.env.API_SECRET;

export function middleware(req: NextRequest) {
  // 仅保护 /api/* 路径
  if (!req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const key = req.headers.get("x-api-key");

  if (!API_SECRET || key !== API_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};

