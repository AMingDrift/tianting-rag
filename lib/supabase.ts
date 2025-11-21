// @deprecated 废弃暂时没用到

// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 注意：在服务端，我们仍然使用 anon key，但通过 RLS 控制权限
// 如果需要绕过 RLS（如管理员操作），应使用 service_role key（⚠️仅限服务端！）
export const createRouteHandlerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

// 如果你需要 bypass RLS（谨慎使用！）
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, serviceRoleKey);
};
