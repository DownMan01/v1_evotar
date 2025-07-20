-- Create elections table
CREATE TABLE public.elections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create positions table
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  max_candidates INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  bio TEXT,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id UUID NOT NULL,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(voter_id, election_id, candidate_id)
);

-- Enable RLS on all tables
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for elections
CREATE POLICY "Elections are viewable by everyone" 
ON public.elections 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage elections" 
ON public.elections 
FOR ALL 
USING (has_role(auth.uid(), 'administrator'));

-- RLS Policies for positions
CREATE POLICY "Positions are viewable by everyone" 
ON public.positions 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage positions" 
ON public.positions 
FOR ALL 
USING (has_role(auth.uid(), 'administrator'));

-- RLS Policies for candidates
CREATE POLICY "Candidates are viewable by everyone" 
ON public.candidates 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage candidates" 
ON public.candidates 
FOR ALL 
USING (has_role(auth.uid(), 'administrator'));

-- RLS Policies for votes
CREATE POLICY "Users can view their own votes" 
ON public.votes 
FOR SELECT 
USING (auth.uid() = voter_id);

CREATE POLICY "Users can cast their own votes" 
ON public.votes 
FOR INSERT 
WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Admins can view all votes" 
ON public.votes 
FOR SELECT 
USING (has_role(auth.uid(), 'administrator'));

-- Create triggers for updated_at
CREATE TRIGGER update_elections_updated_at
BEFORE UPDATE ON public.elections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view for election results
CREATE VIEW public.election_results AS
SELECT 
  e.id as election_id,
  e.title as election_title,
  p.id as position_id,
  p.title as position_title,
  c.id as candidate_id,
  c.full_name as candidate_name,
  COUNT(v.id) as vote_count
FROM public.elections e
JOIN public.positions p ON e.id = p.election_id
JOIN public.candidates c ON p.id = c.position_id AND e.id = c.election_id
LEFT JOIN public.votes v ON c.id = v.candidate_id
GROUP BY e.id, e.title, p.id, p.title, c.id, c.full_name
ORDER BY e.title, p.title, COUNT(v.id) DESC;