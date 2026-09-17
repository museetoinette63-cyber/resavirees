export { auth as middleware } from "@/lib/auth";

// Protects every /admin/* route except /admin/login. The actual
// allow/redirect decision lives in `callbacks.authorized` in src/lib/auth.ts
// — returning false there redirects unauthenticated requests to
// pages.signIn ("/admin/login").
export const config = {
  matcher: ["/admin/:path*"],
};
