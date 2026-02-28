'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, Eye, CalendarDays, Search, Send, Pencil, EyeOff, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSellerEvents, submitEventForApproval, softDeleteEvent, restoreEvent } from '../actions'

const STATUS_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'Nháp' },
  { value: 'pending_approval', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'published', label: 'Đang bán' },
  { value: 'deleted', label: 'Đã ẩn' },
]

const STATUS_BADGE: Record<string, { class: string; label: string }> = {
  draft: { class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: 'Nháp' },
  pending_approval: { class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Chờ duyệt' },
  approved: { class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Đã duyệt' },
  published: { class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Đang bán' },
  cancelled: { class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Đã hủy' },
  completed: { class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Hoàn thành' },
  deleted: { class: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400', label: 'Đã ẩn' },
}

export default function SellerEventsPage() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') || 'all'
  const [activeTab, setActiveTab] = useState(initialStatus)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getSellerEvents(activeTab).then(({ data }) => {
      setEvents(data)
      setLoading(false)
    })
  }, [activeTab])

  async function handleSubmit(eventId: string) {
    setSubmitting(eventId)
    const result = await submitEventForApproval(eventId)
    if (result.success) {
      const { data } = await getSellerEvents(activeTab)
      setEvents(data)
    }
    setSubmitting(null)
  }

  async function handleSoftDelete(eventId: string) {
    if (!confirm('Ẩn sự kiện này? Sự kiện sẽ không hiển thị với khách hàng.')) return
    setDeleting(eventId)
    const result = await softDeleteEvent(eventId)
    if (result.success) {
      const { data } = await getSellerEvents(activeTab)
      setEvents(data)
    }
    setDeleting(null)
  }

  async function handleRestore(eventId: string) {
    setRestoring(eventId)
    const result = await restoreEvent(eventId)
    if (result.success) {
      const { data } = await getSellerEvents(activeTab)
      setEvents(data)
    }
    setRestoring(null)
  }

  const filtered = events.filter((e) =>
    e.event_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý sự kiện</h1>
          <p className="text-muted-foreground mt-1">Tạo và quản lý sự kiện của bạn</p>
        </div>
        <Link href="/seller/events/create">
          <Button>
            <Plus className="w-4 h-4 mr-1.5" />
            Tạo sự kiện
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-1 bg-secondary rounded-lg p-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm sự kiện..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sự kiện</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Địa điểm</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Thời gian</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary rounded animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Chưa có sự kiện nào.{' '}
                    <Link href="/seller/events/create" className="text-primary hover:underline">Tạo sự kiện đầu tiên</Link>
                  </td>
                </tr>
              ) : (
                filtered.map((event) => (
                  <tr key={event.event_id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <CalendarDays className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium">{event.event_name}</span>
                          {event.event_categories && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({event.event_categories.name_vi || event.event_categories.name})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {event.venues ? `${event.venues.venue_name}, ${event.venues.city}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(event.start_time).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${event.is_deleted ? STATUS_BADGE.deleted.class : (STATUS_BADGE[event.status]?.class || '')}`}>
                        {event.is_deleted ? 'Đã ẩn' : (STATUS_BADGE[event.status]?.label || event.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {event.is_deleted ? (
                          <button
                            onClick={() => handleRestore(event.event_id)}
                            disabled={restoring === event.event_id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Khôi phục
                          </button>
                        ) : (
                          <>
                            {event.status === 'draft' && (
                              <button
                                onClick={() => handleSubmit(event.event_id)}
                                disabled={submitting === event.event_id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Gửi duyệt
                              </button>
                            )}
                            {(event.status === 'draft' || event.status === 'pending_approval' || event.status === 'published') && (
                              <Link
                                href={`/seller/events/${event.event_id}/edit`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Chỉnh sửa
                              </Link>
                            )}
                            <button
                              onClick={() => handleSoftDelete(event.event_id)}
                              disabled={deleting === event.event_id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                              Ẩn
                            </button>
                          </>
                        )}
                        <Link
                          href={`/seller/events/${event.event_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Chi tiết
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
