-- Create optimized function to get all election results with voter counts in one query
CREATE OR REPLACE FUNCTION public.get_all_election_results_optimized()
 RETURNS TABLE(
   election_id uuid,
   election_title text,
   election_status text,
   eligible_voters text,
   show_results_to_voters boolean,
   position_id uuid,
   position_title text,
   candidate_id uuid,
   candidate_name text,
   vote_count bigint,
   total_votes_in_position bigint,
   total_eligible_voters_count bigint,
   percentage numeric
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  WITH 
  -- Get eligible voter counts for each election
  eligible_voter_counts AS (
    SELECT 
      e.id as election_id,
      CASE 
        WHEN e.eligible_voters = 'All Courses' OR e.eligible_voters IS NULL THEN 
          (SELECT COUNT(*) FROM public.profiles WHERE role = 'Voter' AND registration_status = 'Approved')
        ELSE 
          (SELECT COUNT(*) FROM public.profiles WHERE role = 'Voter' AND registration_status = 'Approved' AND course = e.eligible_voters)
      END as total_eligible
    FROM public.elections e
    WHERE e.status = 'Completed'
  ),
  -- Get vote counts per position
  position_votes AS (
    SELECT 
      p.election_id,
      p.id as position_id,
      COUNT(v.id) as total_position_votes
    FROM public.positions p
    LEFT JOIN public.candidates c ON c.position_id = p.id
    LEFT JOIN public.votes v ON v.candidate_id = c.id
    WHERE p.election_id IN (SELECT id FROM public.elections WHERE status = 'Completed')
    GROUP BY p.election_id, p.id
  ),
  -- Get vote counts per candidate
  candidate_votes AS (
    SELECT 
      v.election_id,
      v.candidate_id,
      COUNT(*) as vote_count
    FROM public.votes v
    WHERE v.election_id IN (SELECT id FROM public.elections WHERE status = 'Completed')
    GROUP BY v.election_id, v.candidate_id
  )
  SELECT 
    e.id as election_id,
    e.title as election_title,
    e.status as election_status,
    COALESCE(e.eligible_voters, 'All Courses') as eligible_voters,
    e.show_results_to_voters,
    p.id as position_id,
    p.title as position_title,
    c.id as candidate_id,
    c.full_name as candidate_name,
    COALESCE(cv.vote_count, 0) as vote_count,
    COALESCE(pv.total_position_votes, 0) as total_votes_in_position,
    COALESCE(evc.total_eligible, 1) as total_eligible_voters_count,
    CASE 
      WHEN COALESCE(evc.total_eligible, 0) > 0 
      THEN ROUND((COALESCE(cv.vote_count, 0)::numeric / evc.total_eligible::numeric) * 100, 2)
      ELSE 0
    END as percentage
  FROM public.elections e
  JOIN public.positions p ON e.id = p.election_id
  JOIN public.candidates c ON p.id = c.position_id
  LEFT JOIN eligible_voter_counts evc ON evc.election_id = e.id
  LEFT JOIN position_votes pv ON pv.election_id = e.id AND pv.position_id = p.id
  LEFT JOIN candidate_votes cv ON cv.election_id = e.id AND cv.candidate_id = c.id
  WHERE e.status = 'Completed'
  ORDER BY e.created_at DESC, p.title, cv.vote_count DESC NULLS LAST, c.full_name;
$function$