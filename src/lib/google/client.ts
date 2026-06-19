import "server-only";
import { google } from "googleapis";
import { getAppUrl } from "@/lib/env";

export function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Les identifiants Google OAuth sont manquants.");
  return new google.auth.OAuth2(clientId, clientSecret, `${getAppUrl()}/api/google/callback`);
}
