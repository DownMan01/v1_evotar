-- Create storage bucket for election cover photos
INSERT INTO storage.buckets (id, name, public) VALUES ('election-covers', 'election-covers', true);

-- Create storage policies for election cover uploads
CREATE POLICY "Election covers are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'election-covers');

CREATE POLICY "Admins and staff can upload election covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'election-covers' AND (
  public.has_role(auth.uid(), 'Administrator'::user_role) OR 
  public.has_role(auth.uid(), 'Staff'::user_role)
));

CREATE POLICY "Admins and staff can update election covers" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'election-covers' AND (
  public.has_role(auth.uid(), 'Administrator'::user_role) OR 
  public.has_role(auth.uid(), 'Staff'::user_role)
));

CREATE POLICY "Admins and staff can delete election covers" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'election-covers' AND (
  public.has_role(auth.uid(), 'Administrator'::user_role) OR 
  public.has_role(auth.uid(), 'Staff'::user_role)
));

-- Add cover_image_url column to elections table
ALTER TABLE public.elections ADD COLUMN cover_image_url text;