import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Use the Edge-safe auth config — no Node.js-only imports
const { auth } = NextAuth(authConfig);

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes — accessible without authentication
  const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/reset-password"];
  const isPublicRoute = publicRoutes.some((r) =>
    r === "/" ? pathname === "/" : pathname.startsWith(r)
  );

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Logged-in users hitting the landing page go straight to dashboard
  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
