import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import type { Role, UserStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email / mot de passe",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            passwordHash: true,
            role: true,
            status: true,
            isActive: true,
            serviceId: true,
          },
        });

        if (!user?.passwordHash || !user.isActive || user.status !== "active") {
          return null;
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          isActive: user.isActive,
          serviceId: user.serviceId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.status = user.status;
        token.isActive = user.isActive;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.serviceId = user.serviceId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as Role;
        session.user.status = token.status as UserStatus;
        session.user.isActive = Boolean(token.isActive);
        session.user.firstName = String(token.firstName ?? "");
        session.user.lastName = String(token.lastName ?? "");
        session.user.serviceId =
          typeof token.serviceId === "string" ? token.serviceId : null;
        session.user.name =
          token.firstName && token.lastName
            ? `${token.firstName} ${token.lastName}`
            : session.user.name;
      }

      return session;
    },
  },
});
