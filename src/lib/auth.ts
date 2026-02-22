import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

if (!process.env.NEXTAUTH_SECRET) {
  console.error("[auth] NEXTAUTH_SECRET is not set — sessions will not work");
}
if (!process.env.NEXTAUTH_URL) {
  console.error("[auth] NEXTAUTH_URL is not set — callbacks may fail");
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.email === "admin@example.com" && credentials?.password === "password") {
          return { id: "1", name: "Admin User", email: "admin@example.com" };
        }

        if (credentials?.email && credentials?.password) {
          return {
            id: Math.random().toString(),
            name: credentials.email.split('@')[0],
            email: credentials.email,
          };
        }

        return null;
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
};
