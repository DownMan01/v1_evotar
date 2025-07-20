-- Create storage bucket for student ID images
INSERT INTO storage.buckets (id, name, public) VALUES ('student-ids', 'student-ids', false);

-- Create policies for student ID uploads
CREATE POLICY "Users can upload their own student ID" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'student-ids' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own student ID" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'student-ids' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all student IDs" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'student-ids' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'administrator'
  )
);

-- Add new columns to profiles table for additional signup data
ALTER TABLE public.profiles 
ADD COLUMN course text,
ADD COLUMN year_level text,
ADD COLUMN gender text,
ADD COLUMN id_image_url text;