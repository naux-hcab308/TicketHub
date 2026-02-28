'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar, MapPin, ArrowLeft, Minus, Plus, ShoppingCart,
  Loader2, Clock, Building2, Ticket, Grid3x3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getEventDetail, addToCart } from '@/app/customer/actions'
import Header from '@/components/header'
import Footer from '@/components/footer'
import SeatMapPicker from '@/components/seat-map-picker'

interface TicketType {
  ticket_type_id: string
  type_name: string
  price: number
  quantity_total: number
  quantity_sold: number
  sale_start: string | null
  sale_end: string | null
  has_seatmap?: boolean
}

export default function EventDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<any>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [seatPickerTT, setSeatPickerTT] = useState<TicketType | null>(null)

  useEffect(() => {
    getEventDetail(id as string).then(({ event, ticketTypes }) => {
      setEvent(event)
      setTicketTypes(ticketTypes)
      setLoading(false)
    })
  }, [id])

  function updateQuantity(ttId: string, delta: number) {
    setQuantities(prev => {
      const current = prev[ttId] || 0
      const newVal = Math.max(0, Math.min(10, current + delta))
      return { ...prev, [ttId]: newVal }
    })
  }

  async function handleAddToCart(tt: TicketType) {
    const qty = quantities[tt.ticket_type_id] || 0
    if (qty <= 0) return

    setAddingToCart(tt.ticket_type_id)
    setMessage(null)

    const result = await addToCart(tt.ticket_type_id, qty, event.event_id)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: `Đã thêm ${qty} vé "${tt.type_name}" vào giỏ hàng` })
      setQuantities(prev => ({ ...prev, [tt.ticket_type_id]: 0 }))
    }
    setAddingToCart(null)
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

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSearch={() => {}} />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">Sự kiện không tồn tại</p>
          <Link href="/"><Button variant="link">Quay lại trang chủ</Button></Link>
        </div>
      </div>
    )
  }

  const venue = event.venues
  const seller = event.seller_profiles

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={() => {}} />

      {/* Banner */}
      <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 h-64 md:h-80">
        {event.banner_url ? (
          <img src={event.banner_url} alt={event.event_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">🎫</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Event Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </Link>

              <h1 className="text-2xl md:text-3xl font-bold mb-4">{event.event_name}</h1>

              {event.event_categories && (
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary mb-4">
                  {event.event_categories.name_vi || event.event_categories.name}
                </span>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium">
                      {new Date(event.start_time).toLocaleDateString('vi-VN', {
                        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(event.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                </div>

                {venue && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium">{venue.venue_name}</p>
                      <p className="text-muted-foreground">{venue.address}{venue.city ? `, ${venue.city}` : ''}</p>
                    </div>
                  </div>
                )}

                {seller && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <p className="font-medium">Tổ chức bởi: {seller.business_name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-bold mb-3">Giới thiệu sự kiện</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {event.description}
                </div>
              </div>
            )}
          </div>

          {/* Right: Ticket Types */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Ticket className="w-5 h-5" /> Chọn vé
              </h2>

              {message && (
                <div className={`text-sm p-3 rounded-lg mb-4 ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-950/20 text-green-600'
                    : 'bg-red-50 dark:bg-red-950/20 text-red-500'
                }`}>
                  {message.text}
                </div>
              )}

              {ticketTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Chưa có loại vé nào
                </p>
              ) : (
                <div className="space-y-4">
                  {ticketTypes.map((tt) => {
                    const remaining = tt.quantity_total - (tt.quantity_sold ?? 0)
                    const soldOut = remaining <= 0
                    const qty = quantities[tt.ticket_type_id] || 0

                    return (
                      <div key={tt.ticket_type_id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{tt.type_name}</h3>
                            <p className="text-lg font-bold text-primary">
                              {tt.price.toLocaleString('vi-VN')}đ
                            </p>
                          </div>
                          {soldOut ? (
                            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-1 rounded-full font-medium">
                              Hết vé
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Còn {remaining} vé
                            </span>
                          )}
                        </div>

                        {!soldOut && tt.has_seatmap ? (
                          <Button
                            size="sm"
                            className="w-full mt-3"
                            onClick={() => setSeatPickerTT(tt)}
                          >
                            <Grid3x3 className="w-4 h-4 mr-1" /> Chọn ghế
                          </Button>
                        ) : !soldOut ? (
                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center gap-2 bg-secondary rounded-lg">
                              <button
                                onClick={() => updateQuantity(tt.ticket_type_id, -1)}
                                className="p-2 hover:bg-background rounded-l-lg transition-colors"
                                disabled={qty <= 0}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-medium">{qty}</span>
                              <button
                                onClick={() => updateQuantity(tt.ticket_type_id, 1)}
                                className="p-2 hover:bg-background rounded-r-lg transition-colors"
                                disabled={qty >= Math.min(10, remaining)}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(tt)}
                              disabled={qty <= 0 || addingToCart === tt.ticket_type_id}
                              className="flex-1"
                            >
                              {addingToCart === tt.ticket_type_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <><ShoppingCart className="w-4 h-4 mr-1" /> Thêm vào giỏ</>
                              )}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => router.push('/cart')}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" /> Xem giỏ hàng
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Seat Map Picker Modal */}
      {seatPickerTT && event && (
        <SeatMapPicker
          ticketTypeId={seatPickerTT.ticket_type_id}
          eventId={event.event_id}
          typeName={seatPickerTT.type_name}
          price={seatPickerTT.price}
          onClose={() => setSeatPickerTT(null)}
          onSuccess={() => {
            setSeatPickerTT(null)
            setMessage({ type: 'success', text: `Đã thêm ghế vào giỏ hàng` })
          }}
        />
      )}
    </div>
  )
}
