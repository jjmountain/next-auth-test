import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// import AppleProvider from "next-auth/providers/apple"
// import EmailProvider from "next-auth/providers/email"
import type { JWT } from "next-auth/jwt";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "../../../lib/mongodb";

const GOOGLE_AUTHORIZATION_URL =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    prompt: "consent",
    access_type: "offline",
    response_type: "code",
    scope:
      "email profile https://www.googleapis.com/auth/forms.currentonly https://www.googleapis.com/auth/drive.file"
  });

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */

async function refreshAccessToken(token: JWT) {
  try {
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_ID,
        client_secret: process.env.GOOGLE_SECRET,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string
      });

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      method: "POST"
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw new Error(refreshedTokens);
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_at * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken // Fall back to old refresh token
    };
  } catch (error) {
    console.log(error);
    throw new Error("RefreshAccessTokenError");
  }
}

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt"
  },
  // https://next-auth.js.org/configuration/providers/oauth
  providers: [
    /* EmailProvider({
         server: process.env.EMAIL_SERVER,
         from: process.env.EMAIL_FROM,
       }),
    */

    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      authorization: GOOGLE_AUTHORIZATION_URL
    })
  ],
  theme: {
    colorScheme: "light"
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + account.expires_at! * 1000,
          refreshToken: account.refresh_token,
          user
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires!) {
        return token;
      }

      // Access token has expired, try to update it
      try {
        return await refreshAccessToken(token);
      } catch (error) {
        return token;
      }
    },
    async session({ session, token }) {
      session.user = token.user;
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      if (token.error) {
        session.error = token.error;
      }
      console.log("session", session);
      return session;
    }
  }
};

export default NextAuth(authOptions);
