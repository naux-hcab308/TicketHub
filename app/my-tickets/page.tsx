'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Ticket, Loader2, ArrowLeft, Calendar, MapPin, CheckCircle2,
  XCircle, Clock, Armchair,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMyTickets } from '@/app/customer/actions'
import Header from '@/components/header'
import Footer from '@/components/footer'

interface TicketData {
  ticket_id: string
  code: string
  status: string
  created_at: string
  events: {
    event_id: string
    event_name: string
    start_time: string
    end_time: string | null
    venues: { venue_name: string; city: string }[] | null
  } | null
  seats: { label: string; row_label: string; seat_number: number }[] | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  valid: { label: 'Hợp lệ', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', icon: <CheckCircle2 className="w-4 h-4" /> },
  used: { label: 'Đã sử dụng', color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600', icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 dark:bg-red-900/30 text-red-600', icon: <XCircle className="w-4 h-4" /> },
  expired: { label: 'Hết hạn', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
}

export default function MyTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyTickets().then((data) => {
      setTickets(data as unknown as TicketData[])
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onSearch={() => {}} />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Trang chủ
        </Link>

        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Ticket className="w-6 h-6" /> Vé của tôi
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20">
            <Ticket className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Chưa có vé nào</h2>
            <p className="text-muted-foreground mb-6">Mua vé để tham gia các sự kiện hấp dẫn</p>
            <Link href="/"><Button>Khám phá sự kiện</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const ev = ticket.events
              const s = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.valid

              return (
                <button
                  key={ticket.ticket_id}
                  onClick={() => router.push(`/my-tickets/${ticket.ticket_id}`)}
                  className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Ticket className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                          {s.icon} {s.label}
                        </span>
                      </div>
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {ev?.event_name ?? 'Sự kiện'}
                      </h3>
                      <p className="text-sm font-mono text-muted-foreground">{ticket.code}</p>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                        {ev?.start_time && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(ev.start_time).toLocaleDateString('vi-VN', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })}
                          </span>
                        )}
                        {ev?.venues?.[0] && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {ev.venues[0].venue_name}
                          </span>
                        )}
                        {ticket.seats?.[0] && (
                          <span className="flex items-center gap-1 font-medium text-primary">
                            <Armchair className="w-3 h-3" />
                            Ghế {ticket.seats[0].label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
