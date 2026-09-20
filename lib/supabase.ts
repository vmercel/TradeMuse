/**
 * Supabase client for TradeMuse.
 *
 * The publishable key is public by design (it is safe to embed in the app
 * bundle). It only ever grants the permissions the backend's RLS policies
 * allow; all trading secrets stay server side as function secrets.
 * Sessions persist in the OS secure keychain via expo-secure-store.
 */

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

export const SUPABASE_URL = "https://kprkjndaomrecoxwxkvi.supabase.co";

// Public publishable key (safe to embed; safe to ship in the bundle).
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_OknwuwrhG-FCLNYZcIBJIA_9R8IJbZc";

const SecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> =>
    SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> =>
    SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> =>
    SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/** Current access token, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
