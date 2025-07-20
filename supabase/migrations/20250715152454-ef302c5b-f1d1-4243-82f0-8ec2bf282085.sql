-- Update RLS policies to allow staff to delete candidates
DROP POLICY IF EXISTS "Only admins can delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins can update candidates" ON public.candidates;

-- Create new policies allowing both staff and admins to manage candidates
CREATE POLICY "Staff and admins can insert candidates" ON public.candidates
    FOR INSERT WITH CHECK (
        has_role(auth.uid(), 'Administrator'::user_role) OR 
        has_role(auth.uid(), 'Staff'::user_role)
    );

CREATE POLICY "Staff and admins can update candidates" ON public.candidates
    FOR UPDATE USING (
        has_role(auth.uid(), 'Administrator'::user_role) OR 
        has_role(auth.uid(), 'Staff'::user_role)
    );

CREATE POLICY "Staff and admins can delete candidates" ON public.candidates
    FOR DELETE USING (
        has_role(auth.uid(), 'Administrator'::user_role) OR 
        has_role(auth.uid(), 'Staff'::user_role)
    );