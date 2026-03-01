'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CreditCard, ShieldCheck, Loader2, ArrowLeft, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCart, createOrder, getVnpayPaymentUrl } from '@/app/customer/actions'
import Header from '@/components/header'

interface CartItem {
  ticket_type_id: string
  quantity: number
  unit_price: number
  ticket_types: {
    type_name: string
    events: { event_name: string; start_time: string } | null
  } | null
}

type Step = 'review' | 'processing' | 'success' | 'failed'

export default function CheckoutPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('review')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderCode, setOrderCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCart().then((data) => {
      setItems(data.items as CartItem[])
      setTotal(data.total)
      setLoading(false)
      if (data.items.length === 0) router.replace('/cart')
    })
  }, [router])

  async function handlePay() {
    setStep('processing')
    setError(null)

    const orderResult = await createOrder()
    if (orderResult.error) {
      setError(orderResult.error)
      setStep('failed')
      return
    }

    setOrderId(orderResult.orderId!)
    setOrderCode(orderResult.orderCode!)

    const urlResult = await getVnpayPaymentUrl(orderResult.orderId!)
    if (urlResult.error || !urlResult.paymentUrl) {
      setError(urlResult.error || 'Không thể tạo link thanh toán')
      setStep('failed')
      return
    }

    window.location.href = urlResult.paymentUrl
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

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={() => {}} />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {step === 'review' && (
          <>
            <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> Quay lại giỏ hàng
            </Link>

            <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>

            {/* Order Review */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h2 className="font-semibold mb-4">Chi tiết đơn hàng</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.ticket_type_id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{item.ticket_types?.events?.event_name}</p>
                      <p className="text-muted-foreground">{item.ticket_types?.type_name} x{item.quantity}</p>
                    </div>
                    <p className="font-medium">{(item.unit_price * item.quantity).toLocaleString('vi-VN')}đ</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-4 pt-4 flex justify-between">
                <span className="font-bold">Tổng thanh toán</span>
                <span className="text-xl font-bold text-primary">{total.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h2 className="font-semibold mb-4">Phương thức thanh toán</h2>
              <div className="border-2 border-primary rounded-lg p-4 flex items-center gap-3 bg-primary/5">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-border">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">VNPay</p>
                  <p className="text-xs text-muted-foreground">Thanh toán qua VNPay QR / ATM / Visa / MasterCard</p>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6 px-1">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Giao dịch được bảo mật và mã hóa SSL</span>
            </div>

            <Button className="w-full" size="lg" onClick={handlePay}>
              Thanh toán {total.toLocaleString('vi-VN')}đ
            </Button>
          </>
        )}

        {step === 'processing' && (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
            <h2 className="text-xl font-bold mb-2">Đang xử lý thanh toán...</h2>
            <p className="text-muted-foreground">Vui lòng không đóng trang này</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Thanh toán thành công!</h2>
            <p className="text-muted-foreground mb-1">Mã đơn hàng: <span className="font-mono font-bold">{orderCode}</span></p>
            <p className="text-sm text-muted-foreground mb-8">Vé của bạn đã được tạo và sẵn sàng sử dụng</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => router.push('/my-tickets')}>
                Xem vé của tôi
              </Button>
              <Button variant="outline" onClick={() => router.push(`/orders/${orderId}`)}>
                Xem chi tiết đơn hàng
              </Button>
            </div>
          </div>
        )}

        {step === 'failed' && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Thanh toán thất bại</h2>
            <p className="text-muted-foreground mb-2">{error}</p>
            {orderId && (
              <p className="text-sm text-muted-foreground mb-8">
                Mã đơn hàng: <span className="font-mono">{orderCode}</span>
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {orderId ? (
                <Button onClick={() => router.push(`/orders/${orderId}`)}>
                  Xem đơn hàng & Thanh toán lại
                </Button>
              ) : (
                <Button onClick={() => router.push('/cart')}>
                  Quay lại giỏ hàng
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
