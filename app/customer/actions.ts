'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { buildPaymentUrl, isVnpayConfigured, verifyReturnUrl, isVnpaySuccess } from '@/lib/vnpay'
import { confirmOrderAndGenerateTickets } from '@/lib/order-confirm'

// ── Auth helpers ────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

// ── Public Events ───────────────────────────────────────────

export async function getEventCategories() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_categories')
    .select('category_id, slug, name, name_vi')
    .order('sort_order', { ascending: true })
  return data ?? []
}

export async function getPublishedEvents(search?: string, categorySlug?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('events')
    .select('event_id, event_name, description, banner_url, start_time, end_time, status, category_id, venues(venue_name, city), event_categories(slug, name, name_vi)')
    .in('status', ['published', 'approved'])
    .or('is_deleted.is.null,is_deleted.eq.false')
    .order('start_time', { ascending: true })

  if (search) {
    query = query.ilike('event_name', `%${search}%`)
  }

  if (categorySlug && categorySlug !== 'all') {
    const { data: cats } = await supabase.from('event_categories').select('category_id').eq('slug', categorySlug).single()
    if (cats?.category_id) {
      query = query.eq('category_id', cats.category_id)
    }
  }

  const { data } = await query
  return data ?? []
}

export async function getEventDetail(eventId: string) {
  const supabase = await createClient()

  const [eventRes, ticketTypesRes] = await Promise.all([
    supabase
      .from('events')
      .select('event_id, event_name, description, banner_url, start_time, end_time, status, seller_id, venues(venue_id, venue_name, address, city), seller_profiles(business_name), event_categories(slug, name, name_vi)')
      .eq('event_id', eventId)
      .single(),
    supabase
      .from('ticket_types')
      .select('ticket_type_id, type_name, price, quantity_total, quantity_sold, sale_start, sale_end, has_seatmap')
      .eq('event_id', eventId)
      .order('price', { ascending: true }),
  ])

  return {
    event: eventRes.data,
    ticketTypes: ticketTypesRes.data ?? [],
  }
}

// ── Seat Map ────────────────────────────────────────────────

export async function getEventSeats(ticketTypeId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('seats')
    .select('seat_id, row_label, seat_number, label, status, held_by, held_until')
    .eq('ticket_type_id', ticketTypeId)
    .order('row_label', { ascending: true })
    .order('seat_number', { ascending: true })

  // Release expired holds
  const now = new Date()
  const seats = (data ?? []).map(s => {
    if (s.status === 'held' && s.held_until && new Date(s.held_until) < now) {
      return { ...s, status: 'available', held_by: null, held_until: null }
    }
    return s
  })

  return seats
}

export async function holdSeats(seatIds: string[], ticketTypeId: string) {
  const { supabase, user } = await requireUser()

  const holdUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min hold

  // Verify seats are available
  const { data: seats } = await supabase
    .from('seats')
    .select('seat_id, status, held_until')
    .in('seat_id', seatIds)

  const unavailable = (seats ?? []).filter(s => {
    if (s.status === 'sold' || s.status === 'disabled') return true
    if (s.status === 'held' && s.held_until && new Date(s.held_until) > new Date()) return true
    return false
  })

  if (unavailable.length > 0) {
    return { error: `${unavailable.length} ghế không còn trống` }
  }

  // Hold seats
  const { error } = await supabase
    .from('seats')
    .update({ status: 'held', held_by: user.id, held_until: holdUntil })
    .in('seat_id', seatIds)

  if (error) return { error: error.message }
  return { success: true, holdUntil }
}

export async function releaseSeats(seatIds: string[]) {
  const { supabase, user } = await requireUser()

  await supabase
    .from('seats')
    .update({ status: 'available', held_by: null, held_until: null })
    .in('seat_id', seatIds)
    .eq('held_by', user.id)

  return { success: true }
}

export async function addSeatsToCart(ticketTypeId: string, seatIds: string[], eventId: string) {
  const { supabase, user } = await requireUser()

  // Hold seats first
  const holdResult = await holdSeats(seatIds, ticketTypeId)
  if (holdResult.error) return holdResult

  // Get ticket type info
  const { data: tt } = await supabase
    .from('ticket_types')
    .select('price')
    .eq('ticket_type_id', ticketTypeId)
    .single()

  if (!tt) return { error: 'Loại vé không tồn tại' }

  // Add to cart with seat info
  const { supabase: s2, cartId } = await getOrCreateCart()

  // Store seat_ids in cart item (comma separated for simplicity)
  const { data: existing } = await s2
    .from('cart_items')
    .select('quantity, hold_until')
    .eq('cart_id', cartId)
    .eq('ticket_type_id', ticketTypeId)
    .maybeSingle()

  const holdUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  if (existing) {
    await s2
      .from('cart_items')
      .update({
        quantity: existing.quantity + seatIds.length,
        hold_until: holdUntil,
      })
      .eq('cart_id', cartId)
      .eq('ticket_type_id', ticketTypeId)
  } else {
    await s2.from('cart_items').insert({
      cart_id: cartId,
      ticket_type_id: ticketTypeId,
      quantity: seatIds.length,
      unit_price: tt.price,
      hold_until: holdUntil,
    })
  }

  return { success: true }
}

// ── Cart ────────────────────────────────────────────────────

async function getOrCreateCart() {
  const { supabase, user } = await requireUser()

  const { data: cart } = await supabase
    .from('carts')
    .select('cart_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (cart) return { supabase, user, cartId: cart.cart_id }

  const { data: newCart, error } = await supabase
    .from('carts')
    .insert({ user_id: user.id })
    .select('cart_id')
    .single()

  if (error) throw new Error('Không thể tạo giỏ hàng: ' + error.message)
  return { supabase, user, cartId: newCart.cart_id }
}

export async function addToCart(ticketTypeId: string, quantity: number, eventId: string) {
  const { supabase, cartId } = await getOrCreateCart()

  // Check availability
  const { data: tt } = await supabase
    .from('ticket_types')
    .select('quantity_total, quantity_sold, price, sale_start, sale_end')
    .eq('ticket_type_id', ticketTypeId)
    .single()

  if (!tt) return { error: 'Loại vé không tồn tại' }

  const remaining = tt.quantity_total - (tt.quantity_sold ?? 0)
  if (quantity > remaining) return { error: `Chỉ còn ${remaining} vé` }

  if (tt.sale_start && new Date(tt.sale_start) > new Date()) return { error: 'Chưa mở bán' }
  if (tt.sale_end && new Date(tt.sale_end) < new Date()) return { error: 'Đã hết thời gian bán' }

  // Check if already in cart
  const { data: existing } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('cart_id', cartId)
    .eq('ticket_type_id', ticketTypeId)
    .maybeSingle()

  const holdUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min hold

  if (existing) {
    const newQty = existing.quantity + quantity
    if (newQty > remaining) return { error: `Chỉ còn ${remaining} vé (đã có ${existing.quantity} trong giỏ)` }

    await supabase
      .from('cart_items')
      .update({ quantity: newQty, hold_until: holdUntil })
      .eq('cart_id', cartId)
      .eq('ticket_type_id', ticketTypeId)
  } else {
    await supabase.from('cart_items').insert({
      cart_id: cartId,
      ticket_type_id: ticketTypeId,
      quantity,
      unit_price: tt.price,
      hold_until: holdUntil,
    })
  }

  return { success: true }
}

export async function getCart() {
  const { supabase, user } = await requireUser()

  const { data: cart } = await supabase
    .from('carts')
    .select('cart_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cart) return { items: [], total: 0 }

  // Remove expired holds
  await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cart.cart_id)
    .lt('hold_until', new Date().toISOString())

  const { data: items } = await supabase
    .from('cart_items')
    .select('ticket_type_id, quantity, unit_price, hold_until, ticket_types(type_name, event_id, events(event_name, start_time))')
    .eq('cart_id', cart.cart_id)

  const total = (items ?? []).reduce((sum, item) => sum + item.unit_price * item.quantity, 0)

  return { items: items ?? [], total, cartId: cart.cart_id }
}

export async function updateCartItem(ticketTypeId: string, quantity: number) {
  const { supabase, cartId } = await getOrCreateCart()

  if (quantity <= 0) {
    await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId)
      .eq('ticket_type_id', ticketTypeId)
  } else {
    await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('cart_id', cartId)
      .eq('ticket_type_id', ticketTypeId)
  }

  return { success: true }
}

export async function removeCartItem(ticketTypeId: string) {
  const { supabase, cartId } = await getOrCreateCart()

  await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cartId)
    .eq('ticket_type_id', ticketTypeId)

  return { success: true }
}

// ── Checkout / Orders ───────────────────────────────────────

export async function createOrder() {
  const { supabase, user } = await requireUser()

  const cartData = await getCart()
  if (cartData.items.length === 0) return { error: 'Giỏ hàng trống' }

  const orderCode = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  // Create order (customer_id nullable nếu đã chạy migration 007)
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_code: orderCode,
      user_id: user.id,
      customer_id: null,
      total_amount: cartData.total,
      status: 'pending',
      payment_method: 'vnpay',
    })
    .select('order_id, order_code')
    .single()

  if (orderErr || !order) {
    const msg = orderErr?.message || ''
    if (msg.includes('customer_id') && msg.includes('null')) {
      return { error: 'Cấu hình database chưa đúng. Vui lòng chạy migration sql/007_fix_cart_orders_nullable.sql (cho phép customer_id null).' }
    }
    return { error: orderErr ? `Không thể tạo đơn hàng: ${msg}` : 'Không thể tạo đơn hàng' }
  }

  // Create order items
  for (const item of cartData.items) {
    const tt = item.ticket_types as any
    const eventId = tt?.event_id ?? tt?.events?.event_id ?? null
    const { error: itemErr } = await supabase.from('order_items').insert({
      order_id: order.order_id,
      event_id: eventId,
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })
    if (itemErr) {
      return { error: `Lỗi tạo chi tiết đơn: ${itemErr.message}` }
    }
  }

  // Clear cart
  if (cartData.cartId) {
    await supabase.from('cart_items').delete().eq('cart_id', cartData.cartId)
  }

  return { success: true, orderId: order.order_id, orderCode: order.order_code }
}

const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'http://localhost:3000'

/** Trả về URL thanh toán VNPay cho đơn hàng (redirect khách tới VNPay). */
export async function getVnpayPaymentUrl(orderId: string) {
  const { supabase, user } = await requireUser()

  if (!isVnpayConfigured()) {
    return { error: 'Chưa cấu hình VNPay. Vui lòng liên hệ quản trị.' }
  }

  const { data: order } = await supabase
    .from('orders')
    .select('order_id, order_code, total_amount, status')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .single()

  if (!order) return { error: 'Đơn hàng không tồn tại' }
  if (order.status === 'confirmed') return { error: 'Đơn hàng đã được thanh toán' }

  const baseUrl = APP_URL.replace(/\/$/, '')
  const returnUrl = `${baseUrl}/checkout/vnpay/return`
  // Không gửi IPN URL khi chạy localhost: VNPay sandbox sẽ thử gọi và thất bại → hiện lỗi chung.
  // Khi production (domain public) thì gửi để VNPay gọi server-to-server.
  const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
  const ipnUrl = isLocalhost ? undefined : `${baseUrl}/api/vnpay/ipn`

  // orderInfo: chỉ dùng ký tự ASCII, không dấu, không ký tự đặc biệt (yêu cầu VNPay)
  const orderInfo = `Thanh toan ve su kien ${order.order_code}`

  const paymentUrl = buildPaymentUrl({
    amount: order.total_amount,
    txnRef: orderId,
    orderInfo,
    returnUrl,
    ipnUrl,
    locale: 'vn',
  })

  return { success: true, paymentUrl }
}

/**
 * Xác nhận đơn từ Return URL VNPay (fallback khi IPN không gọi tới, ví dụ chạy local).
 * Chỉ gọi khi vnp_ResponseCode=00 và kiểm tra checksum.
 */
export async function confirmOrderFromVnpayReturn(queryString: string) {
  const { supabase, user } = await requireUser()

  const params = new URLSearchParams(queryString)
  const query: Record<string, string> = {}
  params.forEach((v, k) => { query[k] = v })

  if (!verifyReturnUrl(query)) {
    return { success: false, error: 'Chữ ký không hợp lệ' }
  }
  if (!isVnpaySuccess(query.vnp_ResponseCode)) {
    return { success: true, alreadyConfirmed: false }
  }

  const orderId = query.vnp_TxnRef
  if (!orderId) return { success: false, error: 'Thiếu mã đơn' }

  const { data: order } = await supabase
    .from('orders')
    .select('order_id, status')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .single()

  if (!order) return { success: false, error: 'Đơn hàng không tồn tại' }
  if (order.status === 'confirmed') return { success: true, alreadyConfirmed: true }

  const txnNo = query.vnp_TransactionNo || `VNP-${Date.now()}`
  const result = await confirmOrderAndGenerateTickets(supabase, orderId, {
    provider: 'vnpay',
    txnRef: txnNo,
    paymentMethod: 'vnpay',
  })

  if (!result.success) return { success: false, error: result.error || 'Xác nhận thất bại' }
  return { success: true, alreadyConfirmed: false }
}

export async function processPayment(orderId: string) {
  const { supabase, user } = await requireUser()

  const { data: order } = await supabase
    .from('orders')
    .select('order_id, total_amount, status')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .single()

  if (!order) return { error: 'Đơn hàng không tồn tại' }
  if (order.status === 'confirmed') return { error: 'Đơn hàng đã được thanh toán' }

  const result = await confirmOrderAndGenerateTickets(supabase, orderId, {
    provider: 'vnpay',
    txnRef: `VNP-${Date.now()}`,
    paymentMethod: 'vnpay_qr',
  })

  if (!result.success) return { error: result.error || 'Xử lý thanh toán thất bại' }
  return { success: true }
}

// ── Purchase History ────────────────────────────────────────

export async function getOrders() {
  const { supabase, user } = await requireUser()

  const { data } = await supabase
    .from('orders')
    .select('order_id, order_code, total_amount, status, payment_method, paid_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getOrderDetail(orderId: string) {
  const { supabase, user } = await requireUser()

  const { data: order } = await supabase
    .from('orders')
    .select('order_id, order_code, total_amount, status, payment_method, paid_at, created_at')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .single()

  if (!order) return null

  const { data: items } = await supabase
    .from('order_items')
    .select('order_item_id, quantity, unit_price, ticket_types(type_name), events(event_name, start_time, venues(venue_name))')
    .eq('order_id', orderId)

  const { data: payment } = await supabase
    .from('payments')
    .select('payment_id, amount, provider, txn_ref, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { order, items: items ?? [], payment }
}

// ── My Tickets ──────────────────────────────────────────────

export async function getMyTickets() {
  const { supabase, user } = await requireUser()

  const { data: orders } = await supabase
    .from('orders')
    .select('order_id')
    .eq('user_id', user.id)
    .eq('status', 'confirmed')

  if (!orders || orders.length === 0) return []

  const orderIds = orders.map(o => o.order_id)

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('order_item_id')
    .in('order_id', orderIds)

  if (!orderItems || orderItems.length === 0) return []

  const oiIds = orderItems.map(oi => oi.order_item_id)

  const { data: tickets } = await supabase
    .from('tickets')
    .select('ticket_id, code, status, created_at, events(event_id, event_name, start_time, end_time, venues(venue_name, city))')
    .in('order_item_id', oiIds)
    .order('created_at', { ascending: false })

  return tickets ?? []
}

export async function getTicketDetail(ticketId: string) {
  const { supabase, user } = await requireUser()

  // Verify ownership
  const { data: ticket } = await supabase
    .from('tickets')
    .select('ticket_id, code, status, created_at, event_id, order_item_id, events(event_id, event_name, start_time, end_time, description, venues(venue_name, address, city))')
    .eq('ticket_id', ticketId)
    .single()

  if (!ticket) return null

  // Verify this ticket belongs to user's order
  if (ticket.order_item_id) {
    const { data: oi } = await supabase
      .from('order_items')
      .select('order_id, orders(user_id)')
      .eq('order_item_id', ticket.order_item_id)
      .single()

    const orderUser = (oi?.orders as any)?.user_id
    if (orderUser !== user.id) return null
  }

  return ticket
}

export async function getCartCount() {
  const supabase = (await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data: cart } = await supabase
    .from('carts')
    .select('cart_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cart) return 0

  const { data: items } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('cart_id', cart.cart_id)

  return (items ?? []).reduce((sum, i) => sum + i.quantity, 0)
}
