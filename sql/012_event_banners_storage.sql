-- Create event-banners bucket for event banner images (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-banners',
  'event-banners',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (sellers) to upload
DROP POLICY IF EXISTS "Sellers can upload event banners" ON storage.objects;
CREATE POLICY "Sellers can upload event banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-banners');

-- Allow public read (bucket is public)
DROP POLICY IF EXISTS "Event banners are publicly accessible" ON storage.objects;
CREATE POLICY "Event banners are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-banners');
