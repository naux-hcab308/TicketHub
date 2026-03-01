'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, ShoppingBag, CreditCard, CheckCircle2,
  Clock, XCircle, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getOrderDetail, getVnpayPaymentUrl } from '@/app/customer/actions'
import Header from '@/components/header'

interface OrderDetail {
  order: {
    order_id: string
    order_code: string
    total_amount: number
    status: string
    payment_method: string | null
    paid_at: string | null
    created_at: string
  }
  items: Array<{
    order_item_id: string
    quantity: number
    unit_price: number
    ticket_types: { type_name: string } | null
    events: { event_name: string; start_time: string; venues: { venue_name: string } | null } | null
  }>
  payment: {
    payment_id: string
    amount: number
    provider: string
    txn_ref: string
    created_at: string
  } | null
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-6 h-6 text-yellow-500" />,
  confirmed: <CheckCircle2 className="w-6 h-6 text-green-500" />,
  cancelled: <XCircle className="w-6 h-6 text-red-500" />,
  refunded: <RotateCcw className="w-6 h-6 text-gray-500" />,
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ thanh toán',
  confirmed: 'Đã thanh toán',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    getOrderDetail(id as string).then((d) => {
      setData(d as OrderDetail | null)
      setLoading(false)
    })
  }, [id])

  async function handlePayAgain() {
    if (!data) return
    setPaying(true)
    const result = await getVnpayPaymentUrl(data.order.order_id)
    if (result.paymentUrl) {
      window.location.href = result.paymentUrl
    } else {
      setPaying(false)
      alert(result.error || 'Không thể tạo link thanh toán')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSearch={() => {}} />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSearch={() => {}} />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">Đơn hàng không tồn tại</p>
          <Link href="/orders"><Button variant="link">Quay lại</Button></Link>
        </div>
      </div>
    )
  }

  const { order, items, payment } = data

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={() => {}} />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Lịch sử mua hàng
        </Link>

        {/* Order Status */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6 text-center">
          <div className="flex justify-center mb-3">
            {STATUS_ICON[order.status] || STATUS_ICON.pending}
          </div>
          <h1 className="text-xl font-bold mb-1">
            {STATUS_LABEL[order.status] || 'Đang xử lý'}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">{order.order_code}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(order.created_at).toLocaleString('vi-VN')}
          </p>
        </div>

        {/* Items */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Chi tiết đơn hàng
          </h2>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.order_item_id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{(item.events as any)?.event_name}</p>
                  <p className="text-muted-foreground">{(item.ticket_types as any)?.type_name} x{item.quantity}</p>
                  {(item.events as any)?.start_time && (
                    <p className="text-xs text-muted-foreground">
                      {new Date((item.events as any).start_time).toLocaleDateString('vi-VN')}
                      {(item.events as any)?.venues?.venue_name ? ` • ${(item.events as any).venues.venue_name}` : ''}
                    </p>
                  )}
                </div>
                <p className="font-medium whitespace-nowrap">
                  {(item.unit_price * item.quantity).toLocaleString('vi-VN')}đ
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-4 pt-4 flex justify-between">
            <span className="font-bold">Tổng cộng</span>
            <span className="text-lg font-bold text-primary">{order.total_amount.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>

        {/* Payment Info */}
        {payment && (
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Thông tin thanh toán
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phương thức</span>
                <span className="font-medium">VNPay</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mã giao dịch</span>
                <span className="font-mono text-xs">{payment.txn_ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số tiền</span>
                <span className="font-medium">{payment.amount.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          </div>
        )}

        {/* Pay Again */}
        {order.status === 'pending' && (
          <Button className="w-full" size="lg" onClick={handlePayAgain} disabled={paying}>
            {paying ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang xử lý...</>
            ) : (
              <>Thanh toán lại - {order.total_amount.toLocaleString('vi-VN')}đ</>
            )}
          </Button>
        )}

        {order.status === 'confirmed' && (
          <Button className="w-full" size="lg" onClick={() => router.push('/my-tickets')}>
            Xem vé của tôi
          </Button>
        )}
      </div>
    </div>
  )
}
