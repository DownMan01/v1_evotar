-- Add partylist field to candidates table
ALTER TABLE public.candidates ADD COLUMN partylist text;

-- Drop existing policies first
DROP POLICY IF EXISTS "Candidates are viewable by everyone" ON public.candidates;
DROP POLICY IF EXISTS "Only admins can manage candidates" ON public.candidates;

-- Create specific policies for better control
CREATE POLICY "Candidates are viewable by everyone" ON public.candidates
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert candidates" ON public.candidates
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'Administrator'::user_role));

CREATE POLICY "Only admins can update candidates" ON public.candidates
    FOR UPDATE USING (has_role(auth.uid(), 'Administrator'::user_role));

CREATE POLICY "Only admins can delete candidates" ON public.candidates
    FOR DELETE USING (has_role(auth.uid(), 'Administrator'::user_role));