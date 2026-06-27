import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { requireBusinessId } from "@/lib/auth";
import { getAppUrl } from "@/lib/env";
import { createGoogleOAuthClient } from "@/lib/google/client";
import { syncAllJobsToGoogle } from "@/lib/google/sync";
import { encryptRefreshToken } from "@/lib/google/tokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;
  const expectedBusiness = cookieStore.get("google_oauth_business")?.value;
  cookieStore.delete("google_oauth_state"); cookieStore.delete("google_oauth_business");
  const { businessId } = await requireBusinessId();
  if (!expectedState || url.searchParams.get("state") !== expectedState || expectedBusiness !== businessId) return NextResponse.redirect(`${getAppUrl()}/parametres?google=state_error`);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${getAppUrl()}/parametres?google=denied`);
  try {
    const auth = createGoogleOAuthClient();
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token) throw new Error("Aucun jeton de renouvellement reçu.");
    auth.setCredentials(tokens);
    const profile = await google.oauth2({ version: "v2", auth }).userinfo.get();
    const encrypted = encryptRefreshToken(tokens.refresh_token);
    const supabase = await createSupabaseServerClient();
    if (!supabase) throw new Error("Supabase non configuré");
    const { error } = await supabase.from("calendar_connections").upsert({ business_id: businessId, calendar_id: "primary", encrypted_refresh_token: encrypted.encrypted, token_iv: encrypted.iv, token_tag: encrypted.tag, connected_email: profile.data.email, last_error: null, updated_at: new Date().toISOString() }, { onConflict: "business_id" });
    if (error) throw error;
    const syncResult = await syncAllJobsToGoogle(supabase, businessId);
    const syncParams = syncResult.ok
      ? "google=connected"
      : `google=connected_sync_errors&synced=${syncResult.synced}&failed=${syncResult.failed}`;
    return NextResponse.redirect(`${getAppUrl()}/parametres?${syncParams}`);
  } catch {
    return NextResponse.redirect(`${getAppUrl()}/parametres?google=error`);
  }
}
