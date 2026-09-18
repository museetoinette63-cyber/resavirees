import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";

import { prisma } from "./prisma";

// NextAuth v5 config for the back-office. Single AdminUser account for the
// MVP (see AdminRole enum in prisma/schema.prisma — ready for multiple
// profiles later without a schema rewrite). JWT session strategy: no DB
// session table, credentials cannot be persisted server-side per Auth.js
// constraints.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const adminUser = await prisma.adminUser.findUnique({
          where: { email },
        });

        if (!adminUser || !adminUser.actif) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          password,
          adminUser.passwordHash
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.nom,
          role: adminUser.role,
        };
      },
    }),
  ],
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      const jwt = token as JWT;
      if (session.user) {
        session.user.id = jwt.id ?? session.user.id;
        if (jwt.role) {
          session.user.role = jwt.role;
        }
      }
      return session;
    },
  },
});
