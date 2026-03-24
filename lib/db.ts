import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing in .env.local");
if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing in .env.local");

// Service role client — server-side only, never import in client components
// Bypasses Row Level Security — use only in trusted API routes
const supabase = createClient(supabaseUrl, serviceRoleKey);

export default supabase;