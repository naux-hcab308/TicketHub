'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ── Auth guard ──────────────────────────────────────────────

export async function requireSeller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Try seller_profiles first
  const { data: seller } = await supabase
    .from('seller_profiles')
    .select('seller_id, business_name, kyc_status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (seller) return { user, seller }

  // Fallback: check role_id = 2 and auto-create seller_profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role_id, full_name, email')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role_id !== 2) redirect('/')

  const { data: newSeller } = await supabase
    .from('seller_profiles')
    .insert({
      user_id: user.id,
      business_name: profile.full_name || 'My Business',
      email: profile.email,
    })
    .select('seller_id, business_name, kyc_status')
    .single()

  if (!newSeller) redirect('/')
  return { user, seller: newSeller }
}

// ── Dashboard stats ─────────────────────────────────────────

export async function getSellerDashboardStats() {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  const [events, published, tickets, staff] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('seller_id', seller.seller_id),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('seller_id', seller.seller_id).eq('status', 'published'),
    supabase.from('ticket_types').select('quantity_sold').in(
      'event_id',
      (await supabase.from('events').select('event_id').eq('seller_id', seller.seller_id)).data?.map(e => e.event_id) || []
    ),
    supabase.from('staff').select('*', { count: 'exact', head: true }).eq('seller_id', seller.seller_id),
  ])

  const totalTicketsSold = tickets.data?.reduce((sum, t) => sum + (t.quantity_sold || 0), 0) ?? 0

  return {
    totalEvents: events.count ?? 0,
    publishedEvents: published.count ?? 0,
    totalTicketsSold,
    totalStaff: staff.count ?? 0,
    kycStatus: seller.kyc_status,
    businessName: seller.business_name,
  }
}

// ── Seller Profile ──────────────────────────────────────────

export async function getSellerProfile() {
  const { user, seller } = await requireSeller()
  const supabase = await createClient()

  const { data } = await supabase
    .from('seller_profiles')
    .select('*, profiles(full_name, email, phone_number, images)')
    .eq('seller_id', seller.seller_id)
    .single()

  return data
}

export async function updateSellerProfile(formData: FormData) {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  const business_name = formData.get('business_name') as string
  const email = formData.get('email') as string
  const address = formData.get('address') as string
  const bank_name = formData.get('bank_name') as string
  const bank_account_no = formData.get('bank_account_no') as string

  const { error } = await supabase
    .from('seller_profiles')
    .update({ business_name, email, address, bank_name, bank_account_no })
    .eq('seller_id', seller.seller_id)

  if (error) return { error: error.message }
  return { success: true }
}

// ── Event Categories ──────────────────────────────────────────

export async function getEventCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_categories')
    .select('category_id, slug, name, name_vi')
    .order('sort_order', { ascending: true })
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

// ── Events ──────────────────────────────────────────────────

export async function getSellerEvents(status?: string) {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  let query = supabase
    .from('events')
    .select('*, venues(venue_name, city), event_categories(slug, name, name_vi)')
    .eq('seller_id', seller.seller_id)
    .order('created_at', { ascending: false })

  if (status === 'deleted') {
    query = query.eq('is_deleted', true)
  } else {
    query = query.or('is_deleted.is.null,is_deleted.eq.false')
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function getSellerEventById(eventId: string) {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, venues(venue_name, city, address), event_categories(category_id, slug, name, name_vi)')
    .eq('event_id', eventId)
    .eq('seller_id', seller.seller_id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

async function uploadBannerIfPresent(supabase: Awaited<ReturnType<typeof createClient>>, formData: FormData): Promise<string | null> {
  const file = formData.get('banner') as File | null
  if (!file || !(file instanceof File) || file.size === 0) return null

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage
    .from('event-banners')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw new Error(error.message)
  const { data: urlData } = supabase.storage.from('event-banners').getPublicUrl(data.path)
  return urlData.publicUrl
}

export async function createEvent(formData: FormData) {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  let banner_url: string | null = null
  try {
    banner_url = await uploadBannerIfPresent(supabase, formData)
  } catch (e) {
    return { error: (e as Error).message }
  }
  if (!banner_url) {
    const url = formData.get('banner_url') as string
    if (url?.trim()) banner_url = url.trim()
  }

  const venue_name = formData.get('venue_name') as string
  const venue_city = formData.get('venue_city') as string
  const venue_address = formData.get('venue_address') as string

  let venue_id: string | null = null
  if (venue_name) {
    const { data: venue } = await supabase
      .from('venues')
      .insert({ venue_name, city: venue_city, address: venue_address })
      .select('venue_id')
      .single()
    venue_id = venue?.venue_id ?? null
  }

  const category_id = (formData.get('category_id') as string) || null
  const catId = category_id?.trim() || null

  const { data, error } = await supabase
    .from('events')
    .insert({
      event_name: formData.get('event_name') as string,
      description: formData.get('description') as string,
      seller_id: seller.seller_id,
      venue_id,
      category_id: catId,
      banner_url,
      start_time: formData.get('start_time') as string,
      end_time: (formData.get('end_time') as string) || null,
      status: 'draft',
    })
    .select('event_id')
    .single()

  if (error) return { error: error.message }
  return { success: true, eventId: data.event_id }
}

export async function updateEvent(eventId: string, formData: FormData) {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  const venue_name = formData.get('venue_name') as string
  const venue_city = formData.get('venue_city') as string
  const venue_address = formData.get('venue_address') as string

  let venue_id: string | null = null
  const { data: existingEvent } = await supabase
    .from('events')
    .select('venue_id')
    .eq('event_id', eventId)
    .eq('seller_id', seller.seller_id)
    .single()

  if (venue_name?.trim()) {
    if (existingEvent?.venue_id) {
      await supabase
        .from('venues')
        .update({ venue_name, city: venue_city, address: venue_address })
        .eq('venue_id', existingEvent.venue_id)
      venue_id = existingEvent.venue_id
    } else {
      const { data: venue } = await supabase
        .from('venues')
        .insert({ venue_name, city: venue_city, address: venue_address })
        .select('venue_id')
        .single()
      venue_id = venue?.venue_id ?? null
    }
  }

  let banner_url: string | null | undefined
  if (formData.get('clear_banner') === '1') {
    banner_url = null
  } else {
    banner_url = (formData.get('banner_url') as string) || undefined
    if (banner_url === '' || !banner_url?.trim()) banner_url = undefined
  }
  try {
    const uploaded = await uploadBannerIfPresent(supabase, formData)
    if (uploaded) banner_url = uploaded
  } catch (e) {
    return { error: (e as Error).message }
  }

  const category_id = (formData.get('category_id') as string) || null
  const catId = category_id?.trim() || null

  const updatePayload: Record<string, unknown> = {
    event_name: formData.get('event_name') as string,
    description: formData.get('description') as string,
    venue_id,
    category_id: catId,
    start_time: formData.get('start_time') as string,
    end_time: (formData.get('end_time') as string) || null,
    updated_at: new Date().toISOString(),
  }
  if (banner_url !== undefined) updatePayload.banner_url = banner_url || null

  const { error } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('event_id', eventId)
    .eq('seller_id', seller.seller_id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function softDeleteEvent(eventId: string) {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  const { error } = await supabase
    .from('events')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('seller_id', seller.seller_id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function restoreEvent(eventId: string) {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  const { error } = await supabase
    .from('events')
    .update({ is_deleted: false, updated_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('seller_id', seller.seller_id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function submitEventForApproval(eventId: string) {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  const { error: eventErr } = await supabase
    .from('events')
    .update({ status: 'pending_approval', updated_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('seller_id', seller.seller_id)

  if (eventErr) return { error: eventErr.message }

  await supabase.from('event_approval_requests').insert({
    event_id: eventId,
    seller_id: seller.seller_id,
    decision: 'pending',
  })

  return { success: true }
}

// ── Ticket Types ────────────────────────────────────────────

export async function getTicketTypes(eventId: string) {
  await requireSeller()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('price', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function createTicketType(formData: FormData) {
  await requireSeller()
  const supabase = await createClient()

  const { error } = await supabase.from('ticket_types').insert({
    event_id: formData.get('event_id') as string,
    type_name: formData.get('type_name') as string,
    price: parseInt(formData.get('price') as string) || 0,
    quantity_total: parseInt(formData.get('quantity_total') as string) || 0,
    sale_start: (formData.get('sale_start') as string) || null,
    sale_end: (formData.get('sale_end') as string) || null,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateTicketType(ticketTypeId: string, formData: FormData) {
  await requireSeller()
  const supabase = await createClient()

  const { error } = await supabase
    .from('ticket_types')
    .update({
      type_name: formData.get('type_name') as string,
      price: parseInt(formData.get('price') as string) || 0,
      quantity_total: parseInt(formData.get('quantity_total') as string) || 0,
      sale_start: (formData.get('sale_start') as string) || null,
      sale_end: (formData.get('sale_end') as string) || null,
    })
    .eq('ticket_type_id', ticketTypeId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteTicketType(ticketTypeId: string) {
  await requireSeller()
  const supabase = await createClient()

  const { error } = await supabase
    .from('ticket_types')
    .delete()
    .eq('ticket_type_id', ticketTypeId)

  if (error) return { error: error.message }
  return { success: true }
}

// ── Seat Map ─────────────────────────────────────────────────

export async function generateSeatMap(ticketTypeId: string, eventId: string, rows: number, seatsPerRow: number) {
  await requireSeller()
  const supabase = await createClient()

  // Delete existing seats for this ticket type
  await supabase.from('seats').delete().eq('ticket_type_id', ticketTypeId)

  const seats = []
  for (let r = 0; r < rows; r++) {
    const rowLabel = String.fromCharCode(65 + r) // A, B, C...
    for (let s = 1; s <= seatsPerRow; s++) {
      seats.push({
        ticket_type_id: ticketTypeId,
        event_id: eventId,
        row_label: rowLabel,
        seat_number: s,
        label: `${rowLabel}${s}`,
        status: 'available',
      })
    }
  }

  const { error } = await supabase.from('seats').insert(seats)
  if (error) return { error: error.message }

  // Mark ticket type as having seatmap and update total quantity
  await supabase
    .from('ticket_types')
    .update({ has_seatmap: true, quantity_total: rows * seatsPerRow })
    .eq('ticket_type_id', ticketTypeId)

  return { success: true, totalSeats: rows * seatsPerRow }
}

export async function getSeats(ticketTypeId: string) {
  await requireSeller()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('seats')
    .select('seat_id, row_label, seat_number, label, status')
    .eq('ticket_type_id', ticketTypeId)
    .order('row_label', { ascending: true })
    .order('seat_number', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function toggleSeatDisabled(seatId: string) {
  await requireSeller()
  const supabase = await createClient()

  const { data: seat } = await supabase
    .from('seats')
    .select('status')
    .eq('seat_id', seatId)
    .single()

  if (!seat) return { error: 'Ghế không tồn tại' }
  if (seat.status === 'sold' || seat.status === 'held') return { error: 'Không thể thay đổi ghế đã bán/đang giữ' }

  const newStatus = seat.status === 'disabled' ? 'available' : 'disabled'
  await supabase.from('seats').update({ status: newStatus }).eq('seat_id', seatId)

  return { success: true }
}

export async function deleteSeatMap(ticketTypeId: string) {
  await requireSeller()
  const supabase = await createClient()

  await supabase.from('seats').delete().eq('ticket_type_id', ticketTypeId)
  await supabase
    .from('ticket_types')
    .update({ has_seatmap: false })
    .eq('ticket_type_id', ticketTypeId)

  return { success: true }
}

// ── Ticket Buyers ───────────────────────────────────────────

export async function getTicketBuyers(eventId: string) {
  await requireSeller()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('order_items')
    .select('*, orders(order_code, status, paid_at, customer_id, created_at), ticket_types(type_name, price)')
    .eq('event_id', eventId)

  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

// ── Staff ───────────────────────────────────────────────────

export async function getStaff() {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('seller_id', seller.seller_id)
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function addStaff(formData: FormData) {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  const code = `STF-${Date.now().toString(36).toUpperCase()}`

  const { error } = await supabase.from('staff').insert({
    seller_id: seller.seller_id,
    name: formData.get('name') as string,
    employee_code: code,
    staff_number: (formData.get('staff_number') as string) || null,
    shift_id: (formData.get('shift_id') as string) || null,
  })

  if (error) return { error: error.message }
  return { success: true, code }
}

export async function updateStaffStatus(staffId: string, shiftId: string) {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  const { error } = await supabase
    .from('staff')
    .update({ shift_id: shiftId })
    .eq('staff_id', staffId)
    .eq('seller_id', seller.seller_id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteStaff(staffId: string) {
  const { seller } = await requireSeller()
  const supabase = await createClient()

  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('staff_id', staffId)
    .eq('seller_id', seller.seller_id)

  if (error) return { error: error.message }
  return { success: true }
}
