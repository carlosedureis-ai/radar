const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || "";

export const appConfig = {
  apiUrl: (import.meta.env.VITE_API_URL?.trim() || "http://127.0.0.1:3333").replace(/\/$/, ""),
  supabaseUrl: projectUrl.replace(/\/$/, ""),
  supabasePublishableKey: publishableKey,
};

export const supabaseConfigured = Boolean(
  appConfig.supabaseUrl && appConfig.supabasePublishableKey,
);
