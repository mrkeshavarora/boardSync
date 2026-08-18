import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Lightweight auth config — Edge Runtime safe.
 * Does NOT import mongoose, bcrypt, or any Node.js-only modules.
 * Used only by middleware.ts for session checking.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    // Provider listed here so middleware knows credentials are used,
    // but the actual authorize() logic lives in lib/auth.ts
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize() {
        // authorize is only called in Node.js runtime (route handlers),
        // never in Edge (middleware). Safe to return null here.
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.picture = user.image;
      }
      if (trigger === "update" && session?.user?.image) {
        token.picture = session.user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
