-- Add RLS policies for election_results view
-- Enable RLS on election_results
ALTER TABLE public.election_results ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view election results (since it's aggregated, anonymized data)
CREATE POLICY "Election results are viewable by everyone" 
ON public.election_results 
FOR SELECT 
USING (true);

-- Alternative: If you want to restrict based on user permissions, use this instead:
-- CREATE POLICY "Election results viewable by authenticated users" 
-- ON public.election_results 
-- FOR SELECT 
-- USING (auth.uid() IS NOT NULL);