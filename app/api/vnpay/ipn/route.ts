import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
async function processIpn(request: NextRequest): Promise<NextResponse> {
  try {
    const query = await getQueryFromRequest(request)

    if (!verifyReturnUrl(query)) {
      return NextResponse.json(
        { RspCode: '97', Message: 'Invalid checksum' },
        { status: 400 }
      )
    }

    const responseCode = query.vnp_ResponseCode
    const txnRef = query.vnp_TxnRef
    const transactionNo = query.vnp_TransactionNo || ''

    if (!txnRef) {
      return NextResponse.json(
        { RspCode: '99', Message: 'Missing order reference' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: order } = await supabase
      .from('orders')
      .select('order_id, total_amount, status')
      .eq('order_id', txnRef)
      .single()

    if (!order) {
      return NextResponse.json(
        { RspCode: '01', Message: 'Order not found' },
        { status: 200 }
      )
    }

    if (order.status === 'confirmed') {
      return NextResponse.json(
        { RspCode: '00', Message: 'Confirm Success' },
        { status: 200 }
      )
    }

    if (!isVnpaySuccess(responseCode)) {
      return NextResponse.json(
        { RspCode: '00', Message: 'Confirm Success' },
        { status: 200 }
      )
    }

    const result = await confirmOrderAndGenerateTickets(supabase, txnRef, {
      provider: 'vnpay',
      txnRef: transactionNo || `VNP-${Date.now()}`,
      paymentMethod: 'vnpay',
    })

    if (!result.success) {
      return NextResponse.json(
        { RspCode: '99', Message: result.error || 'Internal error' },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { RspCode: '00', Message: 'Confirm Success' },
      { status: 200 }
    )
  } catch (e) {
    console.error('[VNPay IPN]', e)
    return NextResponse.json(
      { RspCode: '99', Message: 'Internal error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return processIpn(request)
}

export async function GET(request: NextRequest) {
  return processIpn(request)
}
