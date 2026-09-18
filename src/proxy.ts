// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (export
// name `proxy` instead of `middleware`) — see node_modules/next/dist/docs.
//
// Deliberately built from the lightweight authConfig (auth.config.ts) via
// its own NextAuth() call, NOT re-exported from "@/lib/auth" — that full
// config imports @prisma/client (21MB+ native query engine binary) and
// bcryptjs, and Turbopack bundling that whole graph just to compile this
// file was taking 15+ minutes / hanging. This proxy only needs the
// `authorized` path-gating callback, which doesn't touch the DB.
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export function proxy(...args: Parameters<typeof auth>) {
  return auth(...args);
}

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
