'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSellerEventById, updateEvent, getEventCategories } from '../../../actions'

export default function EditEventPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<any>(null)
  const [categories, setCategories] = useState<{ category_id: string; slug: string; name: string; name_vi: string | null }[]>([])

  useEffect(() => {
    getEventCategories().then(({ data }) => setCategories(data))
  }, [])
  const [preview, setPreview] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [clearBannerFlag, setClearBannerFlag] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSellerEventById(id).then(({ data, error: err }) => {
      setEvent(data)
      setBannerUrl(data?.banner_url || null)
      setError(err || null)
      setLoading(false)
    })
  }, [id])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
      setClearBannerFlag(false)
    } else {
      setPreview(null)
    }
  }

  function clearBanner() {
    setPreview(null)
    setBannerUrl(null)
    setClearBannerFlag(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    setError(null)
    const result = await updateEvent(id, formData)
    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      router.push(`/seller/events/${id}`)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Không tìm thấy sự kiện.</p>
        <Link href="/seller/events">
          <Button variant="outline">Quay lại danh sách</Button>
        </Link>
      </div>
    )
  }

  const venue = event.venues
  const startTime = event.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : ''
  const endTime = event.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : ''

  return (
    <div className="p-8 max-w-3xl">
      <Link href={`/seller/events/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Link>

      <h1 className="text-2xl font-bold mb-6">Chỉnh sửa sự kiện</h1>

      <form action={handleSubmit} className="space-y-6">
        {/* Event info */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <h2 className="font-semibold border-b border-border pb-3">Thông tin sự kiện</h2>

          <div>
            <label htmlFor="event_name" className="block text-sm font-medium mb-1.5">Tên sự kiện *</label>
            <input id="event_name" name="event_name" type="text" required
              defaultValue={event.event_name}
              className="w-full px-4 py-2.5 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="VD: Đêm nhạc Acoustic" />
          </div>

          <div>
            <label htmlFor="category_id" className="block text-sm font-medium mb-1.5">Danh mục</label>
            <select id="category_id" name="category_id"
              defaultValue={event.category_id || ''}
              className="w-full px-4 py-2.5 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name_vi || c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1.5">Mô tả</label>
            <textarea id="description" name="description" rows={4}
              defaultValue={event.description || ''}
              className="w-full px-4 py-2.5 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Mô tả chi tiết về sự kiện..." />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Hình banner</label>
            <input type="hidden" name="banner_url" value={bannerUrl || ''} />
            <input type="hidden" name="clear_banner" value={clearBannerFlag ? '1' : ''} />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  id="banner"
                  name="banner"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="banner"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-lg border border-border hover:bg-secondary/80 cursor-pointer transition-colors text-sm"
                >
                  <ImagePlus className="w-4 h-4" />
                  {bannerUrl ? 'Thay ảnh' : 'Chọn ảnh'}
                </label>
                {(preview || bannerUrl) && (
                  <button type="button" onClick={clearBanner} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" /> Xóa ảnh
                  </button>
                )}
              </div>
              {(preview || bannerUrl) && (
                <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border border-border bg-secondary">
                  <img src={preview || bannerUrl || ''} alt="Banner" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">Định dạng: JPG, PNG, WebP, GIF. Tối đa 5MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium mb-1.5">Bắt đầu *</label>
              <input id="start_time" name="start_time" type="datetime-local" required
                defaultValue={startTime}
                className="w-full px-4 py-2.5 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium mb-1.5">Kết thúc</label>
              <input id="end_time" name="end_time" type="datetime-local"
                defaultValue={endTime}
                className="w-full px-4 py-2.5 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </div>

        {/* Venue */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <h2 className="font-semibold border-b border-border pb-3">Địa điểm</h2>

          <div>
            <label htmlFor="venue_name" className="block text-sm font-medium mb-1.5">Tên địa điểm</label>
            <input id="venue_name" name="venue_name" type="text"
              defaultValue={venue?.venue_name || ''}
              className="w-full px-4 py-2.5 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="VD: Nhà Văn hóa Thanh Niên" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="venue_city" className="block text-sm font-medium mb-1.5">Thành phố</label>
              <input id="venue_city" name="venue_city" type="text"
                defaultValue={venue?.city || ''}
                className="w-full px-4 py-2.5 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="TP. Hồ Chí Minh" />
            </div>
            <div>
              <label htmlFor="venue_address" className="block text-sm font-medium mb-1.5">Địa chỉ</label>
              <input id="venue_address" name="venue_address" type="text"
                defaultValue={venue?.address || ''}
                className="w-full px-4 py-2.5 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="4 Phạm Ngọc Thạch, Q.1" />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Đang lưu...</> : 'Lưu thay đổi'}
          </Button>
          <Link href={`/seller/events/${id}`}>
            <Button type="button" variant="outline">Hủy</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
