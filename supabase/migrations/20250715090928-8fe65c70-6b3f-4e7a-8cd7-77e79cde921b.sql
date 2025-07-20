-- Update can_user_vote_in_election function to check course eligibility
CREATE OR REPLACE FUNCTION public.can_user_vote_in_election(p_user_id uuid, p_election_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
SELECT 
    -- User must be approved and have voter role (NOT admin or staff)
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = p_user_id 
        AND registration_status = 'Approved'
        AND role = 'Voter'  -- Only voters can vote, not admins or staff
    )
    AND
    -- Election must be active
    EXISTS (
      SELECT 1 FROM public.elections 
      WHERE id = p_election_id 
        AND status = 'Active'
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
    )
    AND
    -- Course eligibility check
    (
      -- If election is for "All Courses", allow all users
      EXISTS (
        SELECT 1 FROM public.elections 
        WHERE id = p_election_id 
          AND (eligible_voters = 'All Courses' OR eligible_voters IS NULL)
      )
      OR
      -- If election is for specific course, check user's course
      EXISTS (
        SELECT 1 FROM public.elections e
        JOIN public.profiles p ON p.user_id = p_user_id
        WHERE e.id = p_election_id 
          AND e.eligible_voters = p.course
      )
    );
$$;