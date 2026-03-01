'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Header from '@/components/header'
import { confirmOrderFromVnpayReturn } from '@/app/customer/actions'

function VnpayReturnContent() {
  const searchParams = useSearchParams()
  const responseCode = searchParams.get('vnp_ResponseCode')
  const txnRef = searchParams.get('vnp_TxnRef')
  const success = responseCode === '00'

  const [confirmState, setConfirmState] = useState<'idle' | 'confirming' | 'done' | 'error'>('idle')
  const [confirmError, setConfirmError] = useState<string | null>(null)

  useEffect(() => {
    if (!success || !txnRef || confirmState !== 'idle') return
    setConfirmState('confirming')
    const rawQuery = typeof window !== 'undefined' ? window.location.search.slice(1) : ''
    confirmOrderFromVnpayReturn(rawQuery)
      .then((res) => {
        if (res.success) setConfirmState('done')
        else {
          setConfirmError(res.error || 'Không xác nhận được đơn hàng')
          setConfirmState('error')
        }
      })
      .catch(() => {
        setConfirmError('Lỗi kết nối')
        setConfirmState('error')
      })
  }, [success, txnRef, confirmState])

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={() => {}} />
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        {success ? (
          <>
            <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Thanh toán thành công</h1>
            <p className="text-muted-foreground mb-6">
              {confirmState === 'confirming' && 'Đang xác nhận đơn hàng...'}
              {(confirmState === 'done' || confirmState === 'idle') && 'Giao dịch VNPay đã hoàn tất. Vé của bạn đã sẵn sàng.'}
              {confirmState === 'error' && confirmError}
            </p>
            {confirmState === 'confirming' && (
              <div className="flex justify-center mb-6">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Thanh toán chưa thành công</h1>
            <p className="text-muted-foreground mb-6">
              {responseCode === '24'
                ? 'Bạn đã hủy giao dịch.'
                : 'Giao dịch thất bại hoặc đã bị hủy. Vui lòng thử lại.'}
            </p>
          </>
        )}

        {txnRef && (
          <p className="text-sm text-muted-foreground mb-8 font-mono">
            Mã đơn: {txnRef}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {txnRef && (
            <Button asChild>
              <Link href={`/orders/${txnRef}`}>Xem đơn hàng</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/orders">Lịch sử đơn hàng</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Về trang chủ</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function VnpayReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <VnpayReturnContent />
    </Suspense>
  )
}
