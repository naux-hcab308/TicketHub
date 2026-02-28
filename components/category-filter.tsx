'use client'

import { useEffect, useState } from 'react'
import { getEventCategories } from '@/app/customer/actions'

interface CategoryFilterProps {
  selected: string
  onSelect: (category: string) => void
}

const ICONS: Record<string, string> = {
  'ca-nhac': '🎵',
  'concert': '🎤',
  'kich': '🎭',
  'the-thao': '⚽',
  'workshop': '✨',
  'hoi-thao': '📋',
  'phim': '🎬',
  'khac': '📌',
}

export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const [categories, setCategories] = useState<{ category_id: string; slug: string; name: string; name_vi: string | null }[]>([])

  useEffect(() => {
    getEventCategories().then(setCategories)
  }, [])

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-6">Danh mục sự kiện</h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onSelect('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
            selected === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-foreground hover:bg-secondary/80'
          }`}
        >
          <span>🎯</span>
          <span>Tất cả</span>
        </button>
        {categories.map((c) => (
          <button
            key={c.category_id}
            onClick={() => onSelect(c.slug)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
              selected === c.slug
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            <span>{ICONS[c.slug] || '📌'}</span>
            <span>{c.name_vi || c.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
