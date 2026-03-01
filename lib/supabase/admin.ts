import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin client dùng service role key — bypass RLS hoàn toàn.
 * CHỈ dùng ở server-side (API routes, server actions nội bộ).
 * KHÔNG bao giờ expose sang client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình trong environment variables.')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
