// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (export
// name `proxy` instead of `middleware`) — see node_modules/next/dist/docs.
export { auth as proxy } from "@/lib/auth";

// Protects every /admin/* route except /admin/login. The actual
// allow/redirect decision lives in `callbacks.authorized` in src/lib/auth.ts
// — returning false there redirects unauthenticated requests to
// pages.signIn ("/admin/login").
export const config = {
  matcher: ["/admin/:path*"],
};
