
-- Add logo_url column to agencias
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for agency logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos-agencias', 'logos-agencias', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their agency logo
CREATE POLICY "Users can upload agency logo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos-agencias' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their agency logo
CREATE POLICY "Users can update agency logo"
ON storage.objects FOR UPDATE
USING (bucket_id = 'logos-agencias' AND auth.role() = 'authenticated');

-- Allow public read access to logos
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos-agencias');
