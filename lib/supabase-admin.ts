import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

const supabaseUrl = env.supabaseUrl ?? "";
const supabaseKey = env.supabaseServiceRoleKey ?? "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase configuration is incomplete. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
