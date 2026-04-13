import { NextRequest, NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hasSameOrigin(request: NextRequest, headerValue: string | null): boolean {
  if (!headerValue) return false;
  try {
    const source = new URL(headerValue);
    return source.origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function isAllowedMutation(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // If browser sends Origin/Referer, at least one of them must be same-origin.
  if (hasSameOrigin(request, origin) || hasSameOrigin(request, referer)) {
    return true;
  }

  // If neither header is present (privacy mode/extensions/non-browser clients),
  // do not block to avoid false positives and broken UX.
  if (!origin && !referer) {
    return true;
  }

  // Explicit cross-site signal: header exists but does not match our origin.
  return false;
}

export function middleware(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  if (!isAllowedMutation(request)) {
    return NextResponse.json(
      { error: "CSRF validation failed: cross-site mutation blocked." },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
