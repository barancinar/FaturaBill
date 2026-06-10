import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL environment variable.");
}
if (!supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable.");
}

export const getSupabaseClient = (clerkToken?: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Clerk manages session persistence, disable Supabase session storage
    },
    global: {
      headers: clerkToken
        ? { Authorization: `Bearer ${clerkToken}` }
        : {},
    },
  });
};
