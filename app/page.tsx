'use client'

import { useState } from 'react'
import Header from '@/components/header'
import Hero from '@/components/hero'
import CategoryFilter from '@/components/category-filter'
import EventGrid from '@/components/event-grid'
import Footer from '@/components/footer'

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={setSearchQuery} />
      <Hero />
      <div id="events-section" className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
        <EventGrid category={selectedCategory} searchQuery={searchQuery} />
      </div>
      <Footer />
    </div>
  )
}
