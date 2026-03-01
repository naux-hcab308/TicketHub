'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, MapPin, Sparkles, Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FeaturedEvent {
  event_id: string
  event_name: string
  banner_url: string | null
  start_time: string
  venues: { venue_name: string; city: string } | null
}

export default function Hero() {
  const [events, setEvents] = useState<FeaturedEvent[]>([])
  const [bgIndex, setBgIndex] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)

  useEffect(() => {
    async function fetchFeaturedEvents() {
      const supabase = createClient()
      const { data } = await supabase
        .from('events')
        .select('event_id, event_name, banner_url, start_time, venues(venue_name, city)')
        .in('status', ['published', 'approved'])
        .or('is_deleted.is.null,is_deleted.eq.false')
        .not('banner_url', 'is', null)
        .order('start_time', { ascending: true })
        .limit(6)
      if (data && data.length > 0) {
        setEvents(data as unknown as FeaturedEvent[])
      }
    }
    fetchFeaturedEvents()
  }, [])

  useEffect(() => {
    if (events.length <= 1) return
    const timer = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setBgIndex(prev => (prev + 1) % events.length)
        setFadeIn(true)
      }, 600)
    }, 4000)
    return () => clearInterval(timer)
  }, [events.length])

  const scrollToEvents = () => {
    document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const currentEvent = events[bgIndex]
  const gridEvents = events.slice(0, 4)

  return (
    <section className="relative min-h-[70vh] sm:min-h-[80vh] md:min-h-[88vh] flex items-center overflow-hidden bg-gray-950">
      {/* Background slideshow */}
      {currentEvent?.banner_url && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={currentEvent.banner_url}
            alt={currentEvent.event_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Layered dark overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Fallback gradient when no images */}
      {events.length === 0 && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-accent" />
      )}

      <div className="relative container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 z-10">
        <div className="max-w-2xl mx-auto md:mx-0">

          {/* ── Text Content ── */}
          <div className="space-y-5 sm:space-y-7">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 text-white/90 text-xs sm:text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 shrink-0" />
              <span className="truncate">Khám phá sự kiện nổi bật hôm nay</span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-2xl">
                <span className="block bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 bg-clip-text text-transparent">
                  Săn vé xịn – Chill hết mình
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/70 max-w-md leading-relaxed">
                Khám phá sự kiện nổi bật hôm nay và tận hưởng trải nghiệm tuyệt vời.
              </p>
            </div>

            {/* Live featured event pill */}
            {currentEvent && (
              <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white w-full sm:w-fit sm:max-w-sm">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
                </span>
                <span className="font-semibold truncate flex-1">{currentEvent.event_name}</span>
                {currentEvent.venues && (
                  <span className="flex items-center gap-1 text-white/60 shrink-0">
                    <MapPin className="w-3 h-3" />
                    <span className="hidden xs:inline">{currentEvent.venues.city}</span>
                    <span className="xs:hidden">{currentEvent.venues.city}</span>
                  </span>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-row gap-3">
              <Button
                size="sm"
                onClick={scrollToEvents}
                className="bg-white text-gray-900 hover:bg-white/90 font-semibold text-sm shadow-xl shadow-white/20 px-4"
              >
                <Ticket className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Khám phá sự kiện
                <ChevronRight className="w-3.5 h-3.5 ml-1 shrink-0" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 bg-transparent backdrop-blur-sm font-medium text-sm px-4"
              >
                Tìm hiểu thêm
              </Button>
            </div>
          </div>
        </div>

        {/* Slideshow dots */}
        {events.length > 1 && (
          <div className="flex justify-center gap-2 mt-10 sm:mt-14">
            {events.map((_, i) => (
              <button
                key={i}
                onClick={() => { setBgIndex(i); setFadeIn(true) }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === bgIndex ? 'bg-white w-8' : 'bg-white/35 w-2'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
