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
    <div className="mb-8 sm:mb-12">
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Sự kiện</h2>
      <div className="flex overflow-x-auto gap-x-6 sm:gap-x-10 md:gap-x-16 text-sm border-b border-gray-200 pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button
          onClick={() => onSelect('all')}
          className={`font-medium transition-colors hover:text-foreground shrink-0 pb-0.5 ${
            selected === 'all'
              ? 'text-foreground border-b-2 border-foreground'
              : 'text-muted-foreground'
          }`}
        >
          Tất cả
        </button>
        {categories.map((c) => (
          <button
            key={c.category_id}
            onClick={() => onSelect(c.slug)}
            className={`font-medium transition-colors hover:text-foreground shrink-0 pb-0.5 ${
              selected === c.slug
                ? 'text-foreground border-b-2 border-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {c.name_vi || c.name}
          </button>
        ))}
      </div>
    </div>
  )
}
