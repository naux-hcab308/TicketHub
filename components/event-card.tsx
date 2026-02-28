'use client'

import Link from 'next/link'
import { MapPin, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EventCardProps {
  event: {
    event_id: string
    event_name: string
    description: string | null
    banner_url: string | null
    start_time: string
    end_time: string | null
    status: string
    venues: { venue_name: string; city: string }[] | { venue_name: string; city: string } | null
    event_categories?: { slug: string; name: string; name_vi: string | null } | null
  }
}

export default function EventCard({ event }: EventCardProps) {
  const venue = Array.isArray(event.venues) ? event.venues[0] : event.venues
  const isOngoing =
    new Date(event.start_time) <= new Date() &&
    event.end_time &&
    new Date(event.end_time) >= new Date()

  return (
    <Link href={`/events/${event.event_id}`}>
      <div className="group bg-card rounded-lg overflow-hidden border border-border hover:shadow-lg hover:border-primary transition-all duration-300">
        <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 h-44 overflow-hidden">
          {event.banner_url ? (
            <img
              src={event.banner_url}
              alt={event.event_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              🎫
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {event.event_categories && (
              <span className="text-xs bg-primary/90 text-primary-foreground px-2.5 py-1 rounded-full font-medium">
                {event.event_categories.name_vi || event.event_categories.name}
              </span>
            )}
            {isOngoing && (
              <span className="flex items-center gap-1 text-xs bg-green-500 text-white px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                Đang diễn ra
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {event.event_name}
          </h3>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>
                {new Date(event.start_time).toLocaleDateString('vi-VN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {venue && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{venue.venue_name}, {venue.city}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border">
            <Button size="sm" className="w-full">
              Xem chi tiết
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}
