-- Add anexos column to tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS anexos TEXT[] DEFAULT '{}';

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ticket-anexos', 'ticket-anexos', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for ticket attachments bucket
CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-anexos');

CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ticket-anexos');

CREATE POLICY "Users can delete own ticket attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-anexos' AND (storage.foldername(name))[1] = auth.uid()::text);