'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

// ── Auth guard ──────────────────────────────────────────────

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role_id !== 1) redirect('/')
  return user
}

// ── Dashboard stats ─────────────────────────────────────────

export async function getDashboardStats() {
  await requireAdmin()
  const supabase = await createClient()

  const [sellers, events, customers, pendingSellers, pendingEvents] = await Promise.all([
    supabase.from('seller_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('seller_profiles').select('*', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
  ])

  return {
    totalSellers: sellers.count ?? 0,
    totalEvents: events.count ?? 0,
    totalCustomers: customers.count ?? 0,
    pendingSellers: pendingSellers.count ?? 0,
    pendingEvents: pendingEvents.count ?? 0,
  }
}

// ── Sellers ─────────────────────────────────────────────────

export async function getSellers(status?: string) {
  await requireAdmin()
  const supabase = await createClient()

  let query = supabase
    .from('seller_profiles')
    .select('*, profiles(full_name, email, phone_number, images)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('kyc_status', status)
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function getSellerDetail(sellerId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('seller_profiles')
    .select('*, profiles(full_name, email, phone_number, images, status, created_at)')
    .eq('seller_id', sellerId)
    .single()

  if (error) return null
  return data
}

export async function updateSellerKyc(sellerId: string, kyc_status: 'verified' | 'rejected') {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('seller_profiles')
    .update({ kyc_status })
    .eq('seller_id', sellerId)

  if (error) return { error: error.message }
  return { success: true }
}

// ── Events ──────────────────────────────────────────────────

export async function getEvents(status?: string) {
  await requireAdmin()
  const supabase = await createClient()

  let query = supabase
    .from('events')
    .select('*, seller_profiles(business_name), venues(venue_name, city), event_categories(slug, name, name_vi)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function getEventDetail(eventId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const [eventResult, ticketsResult] = await Promise.all([
    supabase
      .from('events')
      .select('*, seller_profiles(business_name, email), venues(venue_name, address, city), event_categories(slug, name, name_vi)')
      .eq('event_id', eventId)
      .single(),
    supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', eventId)
      .order('price', { ascending: true }),
  ])

  if (eventResult.error) return null
  return {
    ...eventResult.data,
    ticket_types: ticketsResult.data ?? [],
  }
}

export async function updateEventStatus(eventId: string, status: 'approved' | 'published' | 'cancelled', adminNote?: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { error: eventError } = await supabase
    .from('events')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('event_id', eventId)

  if (eventError) return { error: eventError.message }

  if (status === 'published' || status === 'approved' || status === 'cancelled') {
    const { data: event } = await supabase.from('events').select('seller_id').eq('event_id', eventId).single()
    if (event) {
      await supabase.from('event_approval_requests').insert({
        event_id: eventId,
        seller_id: event.seller_id,
        decision: status === 'cancelled' ? 'rejected' : 'approved',
        admin_note: adminNote ?? null,
        decision_at: new Date().toISOString(),
      })
    }
  }

  return { success: true }
}

// ── Customers ───────────────────────────────────────────────

export async function getCustomers() {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*, roles(role_name)')
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function getCustomerDetail(userId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*, roles(role_name)')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

export async function promoteToSeller(email: string): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin()
  const adminClient = createAdminClient()

  // Find user by email
  const { data: profile, error: fetchError } = await adminClient
    .from('profiles')
    .select('user_id, role_id, full_name, email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (fetchError) return { error: fetchError.message }
  if (!profile) return { error: 'Không tìm thấy người dùng với email này.' }
  if (profile.role_id === 1) return { error: 'Người dùng này là admin, không thể thay đổi.' }
  if (profile.role_id === 2) return { error: 'Người dùng này đã là seller.' }

  // Update role to seller (role_id = 2)
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ role_id: 2, updated_at: new Date().toISOString() })
    .eq('user_id', profile.user_id)

  if (updateError) return { error: updateError.message }

  // Create seller_profiles entry if not exists
  const { data: existing } = await adminClient
    .from('seller_profiles')
    .select('seller_id')
    .eq('user_id', profile.user_id)
    .maybeSingle()

  if (!existing) {
    await adminClient.from('seller_profiles').insert({
      user_id: profile.user_id,
      business_name: profile.full_name || email,
      email: profile.email,
      kyc_status: 'pending',
    })
  }

  return { success: true }
}
