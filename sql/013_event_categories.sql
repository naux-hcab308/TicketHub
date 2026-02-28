-- Event categories table
CREATE TABLE IF NOT EXISTS public.event_categories (
  category_id   uuid default gen_random_uuid() primary key,
  slug          text unique not null,
  name          text not null,
  name_vi       text,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_event_categories_slug ON event_categories(slug);

-- Add category_id to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.event_categories(category_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id);

-- RLS: event_categories is readable by everyone
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event categories are publicly readable" ON public.event_categories;
CREATE POLICY "Event categories are publicly readable"
  ON public.event_categories FOR SELECT
  TO public
  USING (true);

-- Seed categories
INSERT INTO public.event_categories (slug, name, name_vi, sort_order) VALUES
  ('ca-nhac', 'Music', 'Ca nhạc', 1),
  ('concert', 'Concert', 'Concert', 2),
  ('kich', 'Theater', 'Kịch', 3),
  ('the-thao', 'Sports', 'Thể thao', 4),
  ('workshop', 'Workshop', 'Workshop', 5),
  ('hoi-thao', 'Conference', 'Hội thảo', 6),
  ('phim', 'Movie', 'Phim', 7),
  ('khac', 'Other', 'Khác', 99)
ON CONFLICT (slug) DO NOTHING;
