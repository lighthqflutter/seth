import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Main domain or www - no rewrite needed
  if (hostname === "seth.ng" || hostname === "www.seth.ng" || hostname.includes("localhost")) {
    return NextResponse.next();
  }

  // Vercel preview deployments - do not rewrite
  if (hostname.includes(".vercel.app")) {
    return NextResponse.next();
  }

  // Check if it is a subdomain (e.g., divinegrace.seth.ng)
  const domainParts = hostname.split(".");
  if (domainParts.length >= 3 && domainParts[domainParts.length - 2] === "seth") {
    const tenantSubdomain = domainParts[0];

    // Add subdomain as a header
    const response = NextResponse.next();
    response.headers.set("x-tenant-subdomain", tenantSubdomain);

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?\!_next/static|_next/image|favicon.ico|.*\\..*|api).*)"],
};

