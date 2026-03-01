'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Ticket, Calendar, MapPin, CheckCircle2,
  XCircle, Clock, Download, Armchair,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getTicketDetail } from '@/app/customer/actions'
import Header from '@/components/header'

interface TicketDetail {
  ticket_id: string
  code: string
  status: string
  created_at: string
  event_id: string
  events: {
    event_id: string
    event_name: string
    start_time: string
    end_time: string | null
    description: string | null
    venues: { venue_name: string; address: string; city: string } | null
  } | null
  seats: { label: string; row_label: string; seat_number: number }[] | null
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    getTicketDetail(id as string).then((data) => {
      setTicket(data as TicketDetail | null)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (!ticket) return

    async function generateQR() {
      const QRCode = (await import('qrcode')).default
      const url = await QRCode.toDataURL(ticket!.code, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
      setQrDataUrl(url)
    }

    generateQR()
  }, [ticket])

  function handleDownload() {
    if (!qrDataUrl || !ticket) return
    const link = document.createElement('a')
    link.download = `ticket-${ticket.code}.png`
    link.href = qrDataUrl
    link.click()
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

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSearch={() => {}} />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">Vé không tồn tại</p>
          <Link href="/my-tickets"><Button variant="link">Quay lại</Button></Link>
        </div>
      </div>
    )
  }

  const ev = ticket.events
  const venue = ev?.venues

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    valid: { label: 'Hợp lệ', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
    used: { label: 'Đã sử dụng', color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20', icon: <CheckCircle2 className="w-5 h-5 text-gray-400" /> },
    cancelled: { label: 'Đã hủy', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: <XCircle className="w-5 h-5 text-red-500" /> },
    expired: { label: 'Hết hạn', color: 'text-yellow-700', bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: <Clock className="w-5 h-5 text-yellow-500" /> },
  }

  const s = statusConfig[ticket.status] || statusConfig.valid

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={() => {}} />

      <div className="container mx-auto px-4 py-8 max-w-md">
        <Link href="/my-tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Vé của tôi
        </Link>

        {/* Ticket Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
          {/* Top section */}
          <div className="bg-primary/5 p-6 text-center border-b border-dashed border-border relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-background rounded-full" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-background rounded-full" />

            <Ticket className="w-8 h-8 mx-auto text-primary mb-2" />
            <h1 className="text-lg font-bold">{ev?.event_name ?? 'Sự kiện'}</h1>

            <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {ev?.start_time && (
                <p className="flex items-center justify-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(ev.start_time).toLocaleDateString('vi-VN', {
                    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
              {venue && (
                <p className="flex items-center justify-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {venue.venue_name}{venue.city ? `, ${venue.city}` : ''}
                </p>
              )}
              {ticket.seats?.[0] && (
                <p className="flex items-center justify-center gap-1.5 font-semibold text-foreground">
                  <Armchair className="w-4 h-4 text-primary" />
                  Ghế {ticket.seats[0].label}
                </p>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="p-6 flex flex-col items-center">
            <div className={`p-4 rounded-xl mb-4 ${s.bg}`}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </div>

            {/* Ticket Code */}
            <p className="font-mono text-2xl font-bold tracking-widest mb-2">{ticket.code}</p>

            {/* Status */}
            <div className={`flex items-center gap-1.5 text-sm font-medium ${s.color}`}>
              {s.icon}
              {s.label}
            </div>
          </div>

          {/* Bottom info */}
          <div className="bg-secondary/50 px-6 py-4 text-xs text-muted-foreground text-center space-y-1">
            <p>Xuất trình mã QR này tại cổng check-in</p>
            <p>Mã vé: {ticket.code}</p>
            {ticket.seats?.[0] && (
              <p className="font-semibold text-foreground text-sm">
                Số ghế: {ticket.seats[0].label}
              </p>
            )}
          </div>
        </div>

        {/* Download QR */}
        {qrDataUrl && ticket.status === 'valid' && (
          <Button variant="outline" className="w-full mt-4" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> Tải QR Code
          </Button>
        )}
      </div>
    </div>
  )
}
