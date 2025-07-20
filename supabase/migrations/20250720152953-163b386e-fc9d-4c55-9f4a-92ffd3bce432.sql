-- Fix storage policies for election covers and candidate profiles
-- Staff and admins need to be able to upload files

-- Election covers bucket policies
CREATE POLICY "Staff and admins can upload election covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'election-covers' AND 
  (
    public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
    public.has_role(auth.uid(), 'Staff'::public.user_role)
  )
);

CREATE POLICY "Staff and admins can update election covers" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'election-covers' AND 
  (
    public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
    public.has_role(auth.uid(), 'Staff'::public.user_role)
  )
);

CREATE POLICY "Staff and admins can delete election covers" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'election-covers' AND 
  (
    public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
    public.has_role(auth.uid(), 'Staff'::public.user_role)
  )
);

-- Candidate profiles bucket policies
CREATE POLICY "Staff and admins can upload candidate profiles" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'candidate-profiles' AND 
  (
    public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
    public.has_role(auth.uid(), 'Staff'::public.user_role)
  )
);

CREATE POLICY "Staff and admins can update candidate profiles" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'candidate-profiles' AND 
  (
    public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
    public.has_role(auth.uid(), 'Staff'::public.user_role)
  )
);

CREATE POLICY "Staff and admins can delete candidate profiles" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'candidate-profiles' AND 
  (
    public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
    public.has_role(auth.uid(), 'Staff'::public.user_role)
  )
);