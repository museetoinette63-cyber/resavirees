import type { AdminRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Module augmentation: carries `role` (and `id`) from AdminUser through the
// JWT session strategy onto `session.user`, so back-office code can read
// `session.user.role` / `session.user.id` with full type safety.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AdminRole;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: AdminRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AdminRole;
  }
}
