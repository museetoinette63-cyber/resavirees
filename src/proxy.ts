// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (export
// name `proxy` instead of `middleware`) — see node_modules/next/dist/docs.
export { auth as proxy } from "@/lib/auth";

// Protects every /admin/* PAGE route except /admin/login (redirects to
// pages.signIn via `callbacks.authorized` in src/lib/auth.ts).
//
// Deliberately does NOT cover /api/admin/*: a redirect-to-login response is
// the wrong shape for a fetch()/API caller, and per Next.js 16's own proxy
// docs, Server Functions/route handlers should never rely on proxy alone —
// every /api/admin/* route handler must start with its own `auth()` check
// and return 401 JSON when unauthenticated.
export const config = {
  matcher: ["/admin/:path*"],
};
