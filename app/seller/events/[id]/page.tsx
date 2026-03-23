'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CalendarDays, MapPin, Clock, Plus, Pencil,
  Trash2, Loader2, Ticket, Users, Send, X, Grid3x3, Edit,
  EyeOff, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getSellerEventById, getTicketTypes, createTicketType,
  updateTicketType, deleteTicketType, getTicketBuyers,
  submitEventForApproval, softDeleteEvent, restoreEvent,
} from '../../actions'
import SeatMapEditor from '@/components/seat-map-editor'

const STATUS_BADGE: Record<string, { class: string; label: string }> = {
  draft: { class: 'bg-gray-100 text-gray-600', label: 'Nháp' },
  pending_approval: { class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Chờ duyệt' },
  approved: { class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Đã duyệt' },
  published: { class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Đang bán' },
  cancelled: { class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Đã hủy' },
  completed: { class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Hoàn thành' },
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

export default function SellerEventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<any>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [buyers, setBuyers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'tickets' | 'buyers'>('tickets')

  // Ticket form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [seatMapTicketId, setSeatMapTicketId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [eventRes, ticketsRes, buyersRes] = await Promise.all([
      getSellerEventById(id),
      getTicketTypes(id),
      getTicketBuyers(id),
    ])
    setEvent(eventRes.data || null)
    setTickets(ticketsRes.data)
    setBuyers(buyersRes.data)
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  async function handleTicketSubmit(formData: FormData) {
    setFormLoading(true)
    formData.set('event_id', id)
    const result = editingId
      ? await updateTicketType(editingId, formData)
      : await createTicketType(formData)
    if (result.success) {
      setShowForm(false)
      setEditingId(null)
      const { data } = await getTicketTypes(id)
      setTickets(data)
    }
    setFormLoading(false)
  }

  async function handleDeleteTicket(ticketTypeId: string) {
    if (!confirm('Xóa loại vé này?')) return
    await deleteTicketType(ticketTypeId)
    const { data } = await getTicketTypes(id)
    setTickets(data)
  }

  async function handleSubmitForApproval() {
    const result = await submitEventForApproval(id)
    if (result.success) await loadData()
  }

  async function handleSoftDelete() {
    if (!confirm('Ẩn sự kiện này? Sự kiện sẽ không hiển thị với khách hàng nhưng bạn vẫn xem được trong mục "Đã ẩn".')) return
    const result = await softDeleteEvent(id)
    if (result.success) window.location.href = '/seller/events?status=deleted'
  }

  async function handleRestore() {
    const result = await restoreEvent(id)
    if (result.success) await loadData()
  }

  function startEdit(ticket: any) {
    setEditingId(ticket.ticket_type_id)
    setShowForm(true)
  }

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (!event) {
    return <div className="p-8 text-center text-muted-foreground">Không tìm thấy sự kiện.</div>
  }

  const badge = STATUS_BADGE[event.status] || STATUS_BADGE.draft
  const editingTicket = editingId ? tickets.find(t => t.ticket_type_id === editingId) : null
  const isLocked = ['approved', 'published', 'completed', 'cancelled'].includes(event.status)

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/seller/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">{event.event_name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>{badge.label}</span>
            {event.event_categories && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {event.event_categories.name_vi || event.event_categories.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLocked && (
            <>
              <Link href={`/seller/events/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-1.5" />
                  Chỉnh sửa
                </Button>
              </Link>
              {event.status === 'draft' && (
                <Button onClick={handleSubmitForApproval} size="sm">
                  <Send className="w-4 h-4 mr-1.5" />
                  Gửi duyệt
                </Button>
              )}
            </>
          )}
          {event.is_deleted ? (
            <Button variant="outline" size="sm" onClick={handleRestore} className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950/20">
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Khôi phục
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleSoftDelete} className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20">
              <EyeOff className="w-4 h-4 mr-1.5" />
              Ẩn sự kiện
            </Button>
          )}
        </div>
      </div>

      {/* Locked notice */}
      {isLocked && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <span className="mt-0.5 text-base">🔒</span>
          <div>
            <span className="font-semibold">Sự kiện đã được duyệt.</span>{' '}
            Thông tin sự kiện và loại vé không thể chỉnh sửa sau khi admin đã duyệt.
          </div>
        </div>
      )}

      {/* Event info */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" />{event.venues ? `${event.venues.venue_name}, ${event.venues.city}` : '—'}</div>
        <div className="flex items-center gap-2 text-sm"><CalendarDays className="w-4 h-4 text-muted-foreground" />{new Date(event.start_time).toLocaleString('vi-VN')}</div>
        <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-muted-foreground" />{event.end_time ? new Date(event.end_time).toLocaleString('vi-VN') : '—'}</div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveSection('tickets')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeSection === 'tickets' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ticket className="w-4 h-4" /> Loại vé ({tickets.length})
        </button>
        <button
          onClick={() => setActiveSection('buyers')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeSection === 'buyers' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" /> Người mua vé ({buyers.length})
        </button>
      </div>

      {/* Ticket Types Section */}
      {activeSection === 'tickets' && (
        <div className="bg-card rounded-xl border border-border">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Quản lý loại vé</h2>
            {!isLocked && (
              <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setShowForm(true) }}>
                <Plus className="w-4 h-4 mr-1.5" /> Thêm vé
              </Button>
            )}
          </div>

          {/* Ticket Form */}
          {showForm && !isLocked && (
            <div className="p-6 border-b border-border bg-secondary/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">{editingId ? 'Sửa loại vé' : 'Thêm loại vé mới'}</h3>
                <button onClick={() => { setShowForm(false); setEditingId(null) }}><X className="w-4 h-4" /></button>
              </div>
              <form action={handleTicketSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên vé *</label>
                  <input name="type_name" required defaultValue={editingTicket?.type_name || ''}
                    className="w-full px-3 py-2 bg-card text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="VD: VIP, Standard" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Giá (VND) *</label>
                  <input name="price" type="number" required defaultValue={editingTicket?.price || ''}
                    className="w-full px-3 py-2 bg-card text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="500000" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số lượng *</label>
                  <input name="quantity_total" type="number" required defaultValue={editingTicket?.quantity_total || ''}
                    className="w-full px-3 py-2 bg-card text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="100" />
                </div>
                <div />
                <div>
                  <label className="block text-sm font-medium mb-1">Bắt đầu bán</label>
                  <input name="sale_start" type="datetime-local" defaultValue={editingTicket?.sale_start?.slice(0, 16) || ''}
                    className="w-full px-3 py-2 bg-card text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kết thúc bán</label>
                  <input name="sale_end" type="datetime-local" defaultValue={editingTicket?.sale_end?.slice(0, 16) || ''}
                    className="w-full px-3 py-2 bg-card text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" size="sm" disabled={formLoading}>
                    {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                    {editingId ? 'Cập nhật' : 'Thêm vé'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Ticket table */}
          {tickets.length === 0 && !showForm ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Chưa có loại vé nào</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tên vé</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Giá</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tổng</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Đã bán</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <React.Fragment key={t.ticket_type_id}>
                      <tr className="border-b border-border">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t.type_name}</span>
                            {t.has_seatmap && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                Sơ đồ ghế
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatPrice(t.price)}</td>
                        <td className="px-4 py-3 text-right">{t.quantity_total}</td>
                        <td className="px-4 py-3 text-right">{t.quantity_sold}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isLocked && (
                              <>
                                <button
                                  onClick={() => setSeatMapTicketId(seatMapTicketId === t.ticket_type_id ? null : t.ticket_type_id)}
                                  className={`p-1.5 rounded-md transition-colors ${seatMapTicketId === t.ticket_type_id ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                                  title="Sơ đồ ghế"
                                >
                                  <Grid3x3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => startEdit(t)} className="p-1.5 hover:bg-secondary rounded-md transition-colors" title="Sửa">
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => handleDeleteTicket(t.ticket_type_id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors" title="Xóa">
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {seatMapTicketId === t.ticket_type_id && !isLocked && (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 bg-secondary/20 border-b border-border">
                            <SeatMapEditor
                              ticketTypeId={t.ticket_type_id}
                              eventId={id}
                              hasSeatmap={!!t.has_seatmap}
                              onUpdate={() => loadData()}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Buyers Section */}
      {activeSection === 'buyers' && (
        <div className="bg-card rounded-xl border border-border">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">Danh sách người mua vé</h2>
          </div>
          {buyers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Chưa có người mua vé</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mã đơn</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loại vé</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">SL</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Đơn giá</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày mua</th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map((b) => (
                    <tr key={b.order_item_id} className="border-b border-border">
                      <td className="px-4 py-3 font-mono text-xs">{b.orders?.order_code || '—'}</td>
                      <td className="px-4 py-3">{b.ticket_types?.type_name || '—'}</td>
                      <td className="px-4 py-3 text-right">{b.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatPrice(b.unit_price)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          b.orders?.status === 'confirmed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {b.orders?.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {b.orders?.created_at ? new Date(b.orders.created_at).toLocaleDateString('vi-VN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
