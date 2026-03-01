'use client'

import { useEffect, useState } from 'react'
import EventCard from '@/components/event-card'
import { getPublishedEvents } from '@/app/customer/actions'
import { Loader2 } from 'lucide-react'

interface EventGridProps {
  category: string
  searchQuery: string
}

interface Event {
  event_id: string
  event_name: string
  description: string | null
  banner_url: string | null
  start_time: string
  end_time: string | null
  status: string
  category_id: string | null
  venues: { venue_name: string; city: string }[] | null
  event_categories?: { slug: string; name: string; name_vi: string | null }[] | { slug: string; name: string; name_vi: string | null } | null
}

export default function EventGrid({ category, searchQuery }: EventGridProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      getPublishedEvents(searchQuery || undefined, category === 'all' ? undefined : category).then((data) => {
        setEvents(data as Event[])
        setLoading(false)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, category])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-xl font-semibold">
          {events.length} sự kiện
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {events.map((event) => (
          <EventCard key={event.event_id} event={event} />
        ))}
      </div>
      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Không tìm thấy sự kiện nào</p>
          <p className="text-sm text-muted-foreground mt-2">Hãy thử tìm kiếm với từ khóa khác</p>
        </div>
      )}
    </div>
  )
}
