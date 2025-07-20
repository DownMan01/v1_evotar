-- Create anonymous_votes table for truly anonymous voting
CREATE TABLE IF NOT EXISTS public.anonymous_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.anonymous_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous votes
CREATE POLICY "Anonymous votes are viewable by admins and staff" 
ON public.anonymous_votes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('Administrator', 'Staff')
  )
);

-- System can insert anonymous votes
CREATE POLICY "System can insert anonymous votes" 
ON public.anonymous_votes 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_anonymous_votes_election_candidate ON public.anonymous_votes(election_id, candidate_id);
CREATE INDEX idx_anonymous_votes_session_token ON public.anonymous_votes(session_token);