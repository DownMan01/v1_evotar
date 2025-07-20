-- Fix foreign key relationships and ensure data consistency

-- Add foreign key constraints that might be missing
ALTER TABLE public.positions 
ADD CONSTRAINT fk_positions_election 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

ALTER TABLE public.candidates 
ADD CONSTRAINT fk_candidates_position 
FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_candidates_election 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

ALTER TABLE public.votes 
ADD CONSTRAINT fk_votes_candidate 
FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_votes_election 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

ALTER TABLE public.voting_sessions 
ADD CONSTRAINT fk_voting_sessions_election 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_votes_election_candidate ON public.votes(election_id, candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_election ON public.votes(voter_id, election_id);
CREATE INDEX IF NOT EXISTS idx_candidates_election ON public.candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_positions_election ON public.positions(election_id);
CREATE INDEX IF NOT EXISTS idx_voting_sessions_voter_election ON public.voting_sessions(voter_id, election_id);

-- Ensure election status updates work properly by adding a trigger
CREATE OR REPLACE FUNCTION public.auto_update_election_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update upcoming elections to active if start date has passed
  UPDATE public.elections
  SET status = 'Active', updated_at = now()
  WHERE status = 'Upcoming' 
    AND start_date <= now() 
    AND end_date > now();
  
  -- Update active elections to completed if end date has passed
  UPDATE public.elections
  SET status = 'Completed', updated_at = now()
  WHERE status = 'Active' 
    AND end_date <= now();
END;
$$;

-- Create a more robust election results function
CREATE OR REPLACE FUNCTION public.get_election_results_with_stats(p_election_id uuid)
RETURNS TABLE(
  election_id uuid,
  election_title text,
  election_status text,
  eligible_voters text,
  position_id uuid,
  position_title text,
  candidate_id uuid,
  candidate_name text,
  vote_count bigint,
  total_votes_in_position bigint,
  percentage numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH position_votes AS (
    SELECT 
      p.id as position_id,
      COUNT(v.id) as total_position_votes
    FROM public.positions p
    LEFT JOIN public.candidates c ON c.position_id = p.id
    LEFT JOIN public.votes v ON v.candidate_id = c.id AND v.election_id = p_election_id
    WHERE p.election_id = p_election_id
    GROUP BY p.id
  )
  SELECT 
    e.id as election_id,
    e.title as election_title,
    e.status as election_status,
    COALESCE(e.eligible_voters, 'All Courses') as eligible_voters,
    p.id as position_id,
    p.title as position_title,
    c.id as candidate_id,
    c.full_name as candidate_name,
    COALESCE(vote_counts.vote_count, 0) as vote_count,
    COALESCE(pv.total_position_votes, 0) as total_votes_in_position,
    CASE 
      WHEN COALESCE(pv.total_position_votes, 0) > 0 
      THEN ROUND((COALESCE(vote_counts.vote_count, 0)::numeric / pv.total_position_votes::numeric) * 100, 2)
      ELSE 0
    END as percentage
  FROM public.elections e
  JOIN public.positions p ON e.id = p.election_id
  JOIN public.candidates c ON p.id = c.position_id
  LEFT JOIN position_votes pv ON pv.position_id = p.id
  LEFT JOIN (
    SELECT 
      candidate_id, 
      COUNT(*) as vote_count
    FROM public.votes 
    WHERE election_id = p_election_id
    GROUP BY candidate_id
  ) vote_counts ON c.id = vote_counts.candidate_id
  WHERE e.id = p_election_id
  ORDER BY p.title, vote_counts.vote_count DESC NULLS LAST, c.full_name;
$$;

-- Create function to safely create voting session with better error handling
CREATE OR REPLACE FUNCTION public.create_voting_session_safe(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_token TEXT;
  v_voter_id UUID;
  v_can_vote BOOLEAN;
  v_result JSONB;
BEGIN
  -- Get current user
  v_voter_id := auth.uid();
  
  IF v_voter_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User must be authenticated',
      'session_token', null
    );
  END IF;
  
  -- Check if user can vote
  SELECT public.can_user_vote_in_election(v_voter_id, p_election_id) INTO v_can_vote;
  
  IF NOT v_can_vote THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is not eligible to vote in this election',
      'session_token', null
    );
  END IF;
  
  -- Generate unique session token
  v_session_token := encode(gen_random_bytes(32), 'hex');
  
  -- Insert or update voting session
  INSERT INTO public.voting_sessions (
    session_token,
    voter_id,
    election_id
  ) VALUES (
    v_session_token,
    v_voter_id,
    p_election_id
  )
  ON CONFLICT (voter_id, election_id) 
  DO UPDATE SET 
    session_token = v_session_token,
    created_at = now(),
    expires_at = now() + INTERVAL '24 hours'
  WHERE voting_sessions.has_voted = FALSE;
  
  RETURN jsonb_build_object(
    'success', true,
    'error', null,
    'session_token', v_session_token
  );
END;
$$;