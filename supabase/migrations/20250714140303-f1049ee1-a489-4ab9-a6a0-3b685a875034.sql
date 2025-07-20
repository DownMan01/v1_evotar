-- Phase 2: Election Management System Enhancements

-- Add function to automatically update election statuses based on dates
CREATE OR REPLACE FUNCTION public.update_election_statuses()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update upcoming elections to active if start date has passed
  UPDATE public.elections
  SET status = 'active', updated_at = now()
  WHERE status = 'upcoming' 
    AND start_date <= now() 
    AND end_date > now();
  
  -- Update active elections to completed if end date has passed
  UPDATE public.elections
  SET status = 'completed', updated_at = now()
  WHERE status = 'active' 
    AND end_date <= now();
END;
$$;

-- Create function to get election results with vote counts
CREATE OR REPLACE FUNCTION public.get_election_results(p_election_id UUID)
RETURNS TABLE (
  election_id UUID,
  election_title TEXT,
  position_id UUID,
  position_title TEXT,
  candidate_id UUID,
  candidate_name TEXT,
  vote_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    e.id as election_id,
    e.title as election_title,
    p.id as position_id,
    p.title as position_title,
    c.id as candidate_id,
    c.full_name as candidate_name,
    COALESCE(v.vote_count, 0) as vote_count
  FROM public.elections e
  JOIN public.positions p ON e.id = p.election_id
  JOIN public.candidates c ON p.id = c.position_id
  LEFT JOIN (
    SELECT 
      candidate_id, 
      COUNT(*) as vote_count
    FROM public.anonymous_votes 
    WHERE election_id = p_election_id
    GROUP BY candidate_id
  ) v ON c.id = v.candidate_id
  WHERE e.id = p_election_id
  ORDER BY p.title, v.vote_count DESC NULLS LAST, c.full_name;
$$;

-- Add function to check if user can vote in election
CREATE OR REPLACE FUNCTION public.can_user_vote_in_election(
  p_user_id UUID,
  p_election_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    -- User must be approved and have voter role
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = p_user_id 
        AND registration_status = 'approved'
        AND role IN ('voter', 'administrator')
    )
    AND
    -- Election must be active
    EXISTS (
      SELECT 1 FROM public.elections 
      WHERE id = p_election_id 
        AND status = 'active'
        AND start_date <= now()
        AND end_date > now()
    )
    AND
    -- User must not have already voted
    NOT EXISTS (
      SELECT 1 FROM public.voting_sessions 
      WHERE voter_id = p_user_id 
        AND election_id = p_election_id 
        AND has_voted = true
    );
$$;