import type { NextAuthConfig } from "next-auth";

// Lightweight NextAuth config with NO Node-only dependencies (bcryptjs,
// @prisma/client) anywhere in its import graph — used directly by
// src/proxy.ts. Turbopack must bundle proxy.ts's entire import chain, and
// pulling in the full src/lib/auth.ts (which imports @prisma/client, whose
// generated client ships a 21MB+ native query engine binary) made that
// specific compile pathologically slow. src/lib/auth.ts imports this same
// config object and adds the real Credentials provider (which does need
// prisma/bcrypt) for every other use (API routes, server components).
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/admin/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      const isAdminRoute = pathname.startsWith("/admin");
      const isLoginPage = pathname === "/admin/login";

      if (!isAdminRoute || isLoginPage) {
        return true;
      }

      return !!session?.user;
    },
  },
};
