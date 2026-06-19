export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function isDemoMode() {
  return (
    !hasSupabaseConfig() &&
    (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_MODE === "true") &&
    process.env.ALLOW_DEMO_MODE !== "false"
  );
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
