import "next-auth/jwt";
import "next-auth";
import NextAuth, { DefaultSession } from "next-auth";

// Read more at: https://next-auth.js.org/getting-started/typescript#module-augmentation

declare module "next-auth/jwt" {
  interface JWT {
    /** The user's role. */
    userRole?: "admin";
    user?: User;
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    error?: { name: string; message: string };
  }
}

declare module "next-auth" {
  interface User {
    /** The user's role. */
    userRole?: "admin";
  }

  // interface Account {
  //   expires_at: number;
  //   refresh_token: string;
  //   access_token: string;
  // }

  interface Session {
    user: User & DefaultSession["user"];
    accessToken: string;
    accessTokenExpires: number;
    error: { name: string; message: string };
  }
}
