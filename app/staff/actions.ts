'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const STAFF_TOKEN_COOKIE = 'staff_token'

// ── Staff Auth ──────────────────────────────────────────────

export async function staffLogin(employeeCode: string) {
  const supabase = await createClient()

  const { data: staff, error } = await supabase
    .from('staff')
    .select('staff_id, name, seller_id, status, employee_code')
    .eq('employee_code', employeeCode)
    .maybeSingle()

  if (error || !staff) return { error: 'Mã nhân viên không hợp lệ' }
  if (staff.status === 'inactive') return { error: 'Tài khoản đã bị vô hiệu hóa' }

  const token = crypto.randomUUID()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

  await supabase.from('staff_sessions').insert({
    staff_id: staff.staff_id,
    token,
    expires_at: expires.toISOString(),
  })

  const cookieStore = await cookies()
  cookieStore.set(STAFF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires,
    path: '/',
  })

  return { success: true }
}

export async function staffLogout() {
  const cookieStore = await cookies()
  const token = cookieStore.get(STAFF_TOKEN_COOKIE)?.value

  if (token) {
    const supabase = await createClient()
    await supabase.from('staff_sessions').delete().eq('token', token)
    cookieStore.delete(STAFF_TOKEN_COOKIE)
  }

  redirect('/staff/login')
}

export async function getStaffSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(STAFF_TOKEN_COOKIE)?.value
  if (!token) return null

  const supabase = await createClient()

  const { data: session } = await supabase
    .from('staff_sessions')
    .select('staff_id, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!session || new Date(session.expires_at) < new Date()) {
    if (session) await supabase.from('staff_sessions').delete().eq('token', token)
    cookieStore.delete(STAFF_TOKEN_COOKIE)
    return null
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('staff_id, name, seller_id, employee_code, status')
    .eq('staff_id', session.staff_id)
    .single()

  return staff
}

async function requireStaff() {
  const staff = await getStaffSession()
  if (!staff) redirect('/staff/login')
  return staff
}

// ── Assigned Events ─────────────────────────────────────────

export async function getAssignedEvents() {
  const staff = await requireStaff()
  const supabase = await createClient()

  const { data: assignments } = await supabase
    .from('event_staff_assignments')
    .select('event_id, status')
    .eq('staff_id', staff.staff_id)
    .in('status', ['assigned', 'confirmed'])

  if (!assignments || assignments.length === 0) {
    return []
  }

  const eventIds = assignments.map(a => a.event_id)
  const { data: events } = await supabase
    .from('events')
    .select('event_id, event_name, start_time, end_time, status, venues(venue_name, city)')
    .in('event_id', eventIds)
    .in('status', ['published', 'approved', 'completed'])
    .order('start_time', { ascending: false })

  return events ?? []
}

// ── Check-in ────────────────────────────────────────────────

export async function validateTicket(eventId: string, ticketCode: string) {
  const staff = await requireStaff()
  const supabase = await createClient()

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('ticket_id, code, status, event_id, is_placed')
    .eq('code', ticketCode.trim().toUpperCase())
    .maybeSingle()

  if (error || !ticket) {
    return { valid: false, error: 'Mã vé không tồn tại', ticket: null }
  }

  if (ticket.event_id !== eventId) {
    return { valid: false, error: 'Vé không thuộc sự kiện này', ticket }
  }

  if (ticket.status === 'used') {
    const { data: lastCheckin } = await supabase
      .from('checkin_logs')
      .select('checkin_time')
      .eq('ticket_id', ticket.ticket_id)
      .eq('result', 'success')
      .order('checkin_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    return {
      valid: false,
      error: `Vé đã được sử dụng${lastCheckin ? ` lúc ${new Date(lastCheckin.checkin_time).toLocaleString('vi-VN')}` : ''}`,
      ticket,
    }
  }

  if (ticket.status === 'cancelled') {
    return { valid: false, error: 'Vé đã bị hủy', ticket }
  }

  if (ticket.status === 'expired') {
    return { valid: false, error: 'Vé đã hết hạn', ticket }
  }

  return { valid: true, error: null, ticket }
}

export async function confirmCheckin(eventId: string, ticketId: string) {
  const staff = await requireStaff()
  const supabase = await createClient()

  // Double check ticket
  const { data: ticket } = await supabase
    .from('tickets')
    .select('ticket_id, status')
    .eq('ticket_id', ticketId)
    .single()

  if (!ticket || ticket.status !== 'valid') {
    const result = ticket?.status === 'used' ? 'duplicate' : 'failed'
    await supabase.from('checkin_logs').insert({
      ticket_id: ticketId,
      event_id: eventId,
      staff_id: staff.staff_id,
      result,
      note: `Ticket status: ${ticket?.status || 'not found'}`,
    })
    return { success: false, error: 'Vé không hợp lệ hoặc đã sử dụng' }
  }

  // Update ticket status
  await supabase
    .from('tickets')
    .update({ status: 'used' })
    .eq('ticket_id', ticketId)

  // Create checkin log
  await supabase.from('checkin_logs').insert({
    ticket_id: ticketId,
    event_id: eventId,
    staff_id: staff.staff_id,
    result: 'success',
  })

  return { success: true }
}

// ── Statistics ───────────────────────────────────────────────

export async function getEventCheckinStats(eventId: string) {
  await requireStaff()
  const supabase = await createClient()

  const [totalTickets, checkedIn, checkinLogs] = await Promise.all([
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'valid'),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'used'),
    supabase
      .from('checkin_logs')
      .select('checkin_id, result, checkin_time, note, tickets(code)')
      .eq('event_id', eventId)
      .order('checkin_time', { ascending: false })
      .limit(50),
  ])

  const allTickets = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)

  return {
    totalTickets: allTickets.count ?? 0,
    remaining: totalTickets.count ?? 0,
    checkedIn: checkedIn.count ?? 0,
    recentLogs: checkinLogs.data ?? [],
  }
}
