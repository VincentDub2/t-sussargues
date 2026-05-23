import type { DefaultSession } from "next-auth";

import type { Role, UserStatus } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      status: UserStatus;
      isActive: boolean;
      firstName: string;
      lastName: string;
      serviceId: string | null;
    };
  }

  interface User {
    role: Role;
    status: UserStatus;
    isActive: boolean;
    firstName: string;
    lastName: string;
    serviceId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    status?: UserStatus;
    isActive?: boolean;
    firstName?: string;
    lastName?: string;
    serviceId?: string | null;
  }
}
