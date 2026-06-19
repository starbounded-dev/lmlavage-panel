import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireBusinessId } from "@/lib/auth";
import { createGoogleOAuthClient } from "@/lib/google/client";

export async function GET() {
  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return NextResponse.redirect(new URL("/parametres?google=configuration", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  const state = randomBytes(24).toString("base64url");
  const cookieStore = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  cookieStore.set("google_oauth_state", state, options);
  cookieStore.set("google_oauth_business", businessId, options);
  return NextResponse.redirect(createGoogleOAuthClient().generateAuthUrl({
    access_type: "offline", prompt: "consent", state,
    scope: ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/userinfo.email"],
  }));
}
