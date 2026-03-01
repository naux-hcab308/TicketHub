import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyReturnUrl, isVnpaySuccess } from '@/lib/vnpay'
import { confirmOrderAndGenerateTickets } from '@/lib/order-confirm'

async function getQueryFromRequest(request: NextRequest): Promise<Record<string, string>> {
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const body = await request.text()
      const params = new URLSearchParams(body)
      const query: Record<string, string> = {}
      params.forEach((value, key) => { query[key] = value })
      return query
    }
  }
  const query: Record<string, string> = {}
  request.nextUrl.searchParams.forEach((value, key) => { query[key] = value })
  return query
}

/**
 * IPN (Instant Payment Notification) - VNPay gọi server-to-server để báo kết quả thanh toán.
 * Hỗ trợ GET (query string) và POST (body form-urlencoded).
 */
// VNPay yêu cầu IPN luôn trả HTTP 200; kết quả trả qua RspCode trong JSON body
function ok(rspCode: string, message: string) {
  return NextResponse.json({ RspCode: rspCode, Message: message }, { status: 200 })
}

async function processIpn(request: NextRequest): Promise<NextResponse> {
  try {
    const query = await getQueryFromRequest(request)

    if (!verifyReturnUrl(query)) {
      return ok('97', 'Invalid checksum')
    }

    const responseCode = query.vnp_ResponseCode
    const txnRef = query.vnp_TxnRef
    const transactionNo = query.vnp_TransactionNo || ''

    if (!txnRef) {
      return ok('99', 'Missing order reference')
    }

    // Admin client (service role) để bypass RLS — VNPay gọi IPN không có session user
    const supabase = createAdminClient()

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('order_id, total_amount, status')
      .eq('order_id', txnRef)
      .single()

    if (orderErr || !order) {
      return ok('01', 'Order not found')
    }

    if (order.status === 'confirmed') {
      return ok('00', 'Confirm Success')
    }

    if (!isVnpaySuccess(responseCode)) {
      // Thanh toán thất bại: ghi nhận nhưng vẫn trả 00 để VNPay không retry
      return ok('00', 'Confirm Success')
    }

    const result = await confirmOrderAndGenerateTickets(supabase, txnRef, {
      provider: 'vnpay',
      txnRef: transactionNo || `VNP-${Date.now()}`,
      paymentMethod: 'vnpay',
    })

    return ok(result.success ? '00' : '99', result.success ? 'Confirm Success' : (result.error || 'Internal error'))
  } catch (e) {
    console.error('[VNPay IPN]', e)
    return ok('99', 'Internal error')
  }
}

export async function POST(request: NextRequest) {
  return processIpn(request)
}

export async function GET(request: NextRequest) {
  return processIpn(request)
}
