-- Add eligible_voters column to elections table
ALTER TABLE public.elections ADD COLUMN eligible_voters text DEFAULT 'All Courses';