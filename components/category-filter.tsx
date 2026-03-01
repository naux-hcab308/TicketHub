'use client'

import { useEffect, useState } from 'react'
import { getEventCategories } from '@/app/customer/actions'

interface CategoryFilterProps {
  selected: string
  onSelect: (category: string) => void
}

export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const [categories, setCategories] = useState<{ category_id: string; slug: string; name: string; name_vi: string | null }[]>([])

  useEffect(() => {
    getEventCategories().then(setCategories)
  }, [])

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-4">Sự kiện</h2>
      <div className="flex flex-wrap gap-x-20 gap-y-2 text-sm border-b border-gray-200 pb-3">
        <button
          onClick={() => onSelect('all')}
          className={`font-medium transition-colors hover:text-foreground ${
            selected === 'all' ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          Tất cả
        </button>
        {categories.map((c) => (
          <button
            key={c.category_id}
            onClick={() => onSelect(c.slug)}
            className={`font-medium transition-colors hover:text-foreground ${
              selected === c.slug ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {c.name_vi || c.name}
          </button>
        ))}
      </div>
    </div>
  )
}
