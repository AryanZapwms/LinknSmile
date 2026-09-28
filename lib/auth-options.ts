import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { verifyPassword } from "@/lib/auth";
import { LOCALE_COOKIE } from "@/i18n/request";
import { resolveLocaleFromCookieValue } from "@/lib/i18n-config";

const KNOWN_AUTH_ERRORS = new Set([
  "MissingCredentials",
  "InvalidCredentials",
  "EmailNotVerified",
  "OAuthAccountExists",
  "AccountDisabled",
]);

// How often a session's isActive/role is re-read from the DB — matches
// session.updateAge below.
const DB_RECHECK_MS = 60 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("MissingCredentials");
        }
        const email = credentials.email.trim().toLowerCase();
        try {
          await connectDB();
          const userDoc = await User.findOne({ email });
          if (!userDoc) throw new Error("InvalidCredentials");
          if (!userDoc.password) throw new Error("OAuthAccountExists");
          if (!userDoc.isVerified) throw new Error("EmailNotVerified");
          const isValid = await verifyPassword(credentials.password, userDoc.password);
          if (!isValid) throw new Error("InvalidCredentials");
          // Checked after the password so it doesn't reveal account status to non-owners.
          if (userDoc.isActive === false) throw new Error("AccountDisabled");
          let shopId = userDoc.shopId;
          if (userDoc.role === "shop_owner" && !shopId) {
            const Shop = (await import("@/lib/models/shop")).default;
            const shop = await Shop.findOne({ ownerId: userDoc._id });
            if (shop) {
              userDoc.shopId = shop._id;
              await userDoc.save();
              shopId = shop._id;
            }
          }
          return {
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name || "User",
            role: userDoc.role || "user",
            shopId: shopId?.toString() || null,
          };
        } catch (error: any) {
          if (error instanceof Error && KNOWN_AUTH_ERRORS.has(error.message)) {
            throw error;
          }
          throw new Error("ServerError");
        }
      },
    }),
  ],
  callbacks: {
    // Google sign-in bypasses authorize(), so deactivated accounts are blocked here.
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.email) {
        await connectDB();
        const existing = await User.findOne({ email: user.email.toLowerCase() })
          .select("isActive")
          .lean<{ isActive?: boolean }>();
        if (existing?.isActive === false) return false;
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (account?.provider === "google" && user?.email) {
        await connectDB();
        const email = user.email.toLowerCase();
        let dbUser = await User.findOne({ email });
        if (!dbUser) {
          const store = await cookies();
          const locale = resolveLocaleFromCookieValue(store.get(LOCALE_COOKIE)?.value);
          dbUser = await User.create({
            email,
            name: user.name || "User",
            role: "user",
            isVerified: true,
            isActive: true,
            locale,
          });
        }
        token.id = dbUser._id.toString();
        token.role = dbUser.role || "user";
        token.shopId = dbUser.shopId?.toString() || null;
        token.checkedAt = Date.now();
        return token;
      }
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.shopId = user.shopId;
        token.checkedAt = Date.now();
        return token;
      }

      // Re-read isActive/role/shopId from the DB at most once per
      // DB_RECHECK_MS, and on every update() call. update() payloads from
      // the client are deliberately ignored — role/shopId only ever come
      // from the DB (callers such as app/vendor-apply save them first).
      const isStale = !token.checkedAt || Date.now() - token.checkedAt > DB_RECHECK_MS;
      if (trigger === "update" || isStale) {
        let dbUser: { isActive?: boolean; role?: string; shopId?: unknown } | null;
        try {
          await connectDB();
          dbUser = await User.findById(token.id)
            .select("isActive role shopId")
            .lean<{ isActive?: boolean; role?: string; shopId?: unknown }>();
        } catch (err) {
          // DB unavailable: keep the current token rather than logging
          // everyone out; the check is retried on the next request.
          console.error("[auth] jwt re-check failed, keeping token", err);
          return token;
        }
        if (!dbUser || dbUser.isActive === false) {
          // next-auth catches this, clears the session cookie and treats the
          // request as signed out (getServerSession() returns null).
          throw new Error("SessionRevoked");
        }
        token.role = dbUser.role || "user";
        token.shopId = dbUser.shopId ? String(dbUser.shopId) : null;
        token.checkedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.shopId = token.shopId as string | null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      try {
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        const parsed = new URL(url);
        const parsedBase = new URL(baseUrl);
        if (parsed.origin === parsedBase.origin) return url;
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },
  },
  pages: { signIn: "/auth/login", error: "/auth/login" },
  session: { strategy: "jwt", maxAge: 24 * 60 * 60, updateAge: 60 * 60 },
  jwt: { maxAge: 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};