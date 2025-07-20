-- Create storage bucket for candidate profile pictures
INSERT INTO storage.buckets (id, name, public) VALUES ('candidate-profiles', 'candidate-profiles', true);

-- Create storage policies for candidate profile pictures
CREATE POLICY "Candidate profile images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'candidate-profiles');

CREATE POLICY "Staff and admins can upload candidate profiles" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'candidate-profiles' 
  AND (
    public.has_role(auth.uid(), 'Staff'::user_role) 
    OR public.has_role(auth.uid(), 'Administrator'::user_role)
  )
);

CREATE POLICY "Staff and admins can update candidate profiles" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'candidate-profiles' 
  AND (
    public.has_role(auth.uid(), 'Staff'::user_role) 
    OR public.has_role(auth.uid(), 'Administrator'::user_role)
  )
);

-- Add new fields to candidates table
ALTER TABLE public.candidates 
ADD COLUMN why_vote_me text,
ADD COLUMN jhs_school text,
ADD COLUMN jhs_graduation_year integer,
ADD COLUMN shs_school text,
ADD COLUMN shs_graduation_year integer;