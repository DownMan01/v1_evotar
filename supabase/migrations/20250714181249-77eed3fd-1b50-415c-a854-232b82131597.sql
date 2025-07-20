-- Update storage policies to allow unauthenticated uploads during signup
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can upload their own student ID" ON storage.objects;

-- Create a new policy that allows uploads to student-ids bucket for signup
CREATE POLICY "Allow student ID uploads during signup" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'student-ids');

-- Keep the viewing policies as they are for security
-- Users can still only view their own files after authentication