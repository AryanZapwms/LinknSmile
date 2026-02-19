import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { verifyPassword } from "@/lib/auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Normalize and validate email
        const email = credentials.email.trim().toLowerCase();

        try {
          await connectDB();
          const userDoc = await User.findOne({ email });

          if (!userDoc) {
            throw new Error("Invalid email or password");
          }

          if (!userDoc.isVerified) {
            throw new Error("Please verify your email before logging in");
          }

          const isValid = await verifyPassword(credentials.password, userDoc.password);

          if (!isValid) {
            throw new Error("Invalid email or password");
          }

          let shopId = userDoc.shopId;

          // Auto-link shop if missing for shop_owners
          if (userDoc.role === "shop_owner" && !shopId) {
            console.log(`[NextAuth] Auto-linking shop for ${email}`);
            const Shop = (await import("@/lib/models/shop")).default;
            const shop = await Shop.findOne({ ownerId: userDoc._id });
            if (shop) {
              userDoc.shopId = shop._id;
              await userDoc.save();
              shopId = shop._id;
              console.log(`[NextAuth] Fixed shopId for user ${email}`);
            }
          }

          //  Return a sanitized user object (NextAuth encodes this in JWT)
          return {
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name || "User",
            role: userDoc.role || "user",
            shopId: shopId?.toString() || null,
          };
        } catch (error: any) {
          console.error("NextAuth authorize error:", error);
          throw new Error("Unable to sign in. Please try again later.");
        }
      },
    }),
  ],

  callbacks: {
 
    async jwt({ token, user, trigger, session  }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.shopId = user.shopId;
      }
      // Handle session updates (for profile changes)
      if (trigger === "update" && session) {
        token.role = session.role;
        token.shopId = session.shopId;
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
  },


  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 hour session lifespan
    updateAge: 60 * 60, // Refresh token every 15 minutes
  },

  jwt: {
    maxAge: 60 * 60, // Match session maxAge
  },


  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions); 
export { handler as GET, handler as POST };
