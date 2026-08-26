import { createClient } from "@supabase/supabase-js";
import { appConfig, supabaseConfigured } from "./config";

export const supabase = supabaseConfigured
  ? createClient(appConfig.supabaseUrl, appConfig.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
