-- Fix database function search path vulnerability
-- Update all functions to use SET search_path = ''

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_email_by_student_id(_student_id text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT email
  FROM public.profiles
  WHERE student_id = _student_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.log_audit_action(p_actor_id uuid, p_actor_role user_role, p_action text, p_resource_type text DEFAULT NULL::text, p_resource_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_actor_id,
    p_actor_role,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_voting_session(p_election_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
DECLARE
  v_session_token TEXT;
  v_voter_id UUID;
BEGIN
  -- Get current user
  v_voter_id := auth.uid();
  
  IF v_voter_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
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
  
  RETURN v_session_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_user_vote_in_election(p_user_id uuid, p_election_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.approve_user_registration(p_user_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'Administrator'::user_role) THEN
    RAISE EXCEPTION 'Only administrators can approve user registrations';
  END IF;
  
  -- Update registration status to approved
  UPDATE public.profiles
  SET 
    registration_status = 'Approved',
    updated_at = now()
  WHERE user_id = p_user_id AND registration_status = 'Pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or already processed';
  END IF;
  
  -- Log the approval action
  PERFORM public.log_audit_action(
    auth.uid(),
    'Administrator'::user_role,
    'approve_user_registration',
    'user_profile',
    p_user_id,
    jsonb_build_object(
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_anonymous_vote(p_session_token text, p_candidate_id uuid, p_election_id uuid, p_position_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
DECLARE
  v_session_record RECORD;
BEGIN
  -- Verify session exists and is valid
  SELECT * INTO v_session_record
  FROM public.voting_sessions
  WHERE session_token = p_session_token
    AND election_id = p_election_id
    AND expires_at > now()
    AND has_voted = FALSE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired voting session';
  END IF;
  
  -- Insert anonymous vote
  INSERT INTO public.votes (
    voter_id,
    candidate_id,
    election_id
  ) VALUES (
    v_session_record.voter_id,
    p_candidate_id,
    p_election_id
  );
  
  -- Mark session as used
  UPDATE public.voting_sessions
  SET has_voted = TRUE
  WHERE session_token = p_session_token;
  
  -- Log the voting action (without revealing voter identity)
  PERFORM public.log_audit_action(
    NULL, -- No actor_id to maintain anonymity
    'Voter'::user_role,
    'cast_vote',
    'election',
    p_election_id,
    jsonb_build_object(
      'position_id', p_position_id,
      'candidate_id', p_candidate_id
    )
  );
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_user_registration(p_user_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'Administrator'::user_role) THEN
    RAISE EXCEPTION 'Only administrators can reject user registrations';
  END IF;
  
  -- Update registration status to rejected
  UPDATE public.profiles
  SET 
    registration_status = 'Rejected',
    updated_at = now()
  WHERE user_id = p_user_id AND registration_status = 'Pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or already processed';
  END IF;
  
  -- Log the rejection action
  PERFORM public.log_audit_action(
    auth.uid(),
    'Administrator'::user_role,
    'reject_user_registration',
    'user_profile',
    p_user_id,
    jsonb_build_object(
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_pending_action(p_action_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
DECLARE
  v_action RECORD;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'Administrator'::user_role) THEN
    RAISE EXCEPTION 'Only administrators can reject actions';
  END IF;
  
  -- Get the pending action
  SELECT * INTO v_action
  FROM public.pending_actions
  WHERE id = p_action_id AND status = 'Pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending action not found or already processed';
  END IF;
  
  -- Mark action as rejected
  UPDATE public.pending_actions
  SET 
    status = 'Rejected',
    admin_notes = p_admin_notes,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_action_id;
  
  -- Log the rejection action
  PERFORM public.log_audit_action(
    auth.uid(),
    'Administrator'::user_role,
    'reject_action',
    'pending_action',
    p_action_id,
    jsonb_build_object(
      'action_type', v_action.action_type,
      'original_requester', v_action.requested_by,
      'reason', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_pending_action(p_action_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
DECLARE
  v_action RECORD;
  v_election_id UUID;
  v_position_id UUID;
  v_cover_url TEXT;
  v_temp_path TEXT;
  v_final_path TEXT;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'Administrator'::user_role) THEN
    RAISE EXCEPTION 'Only administrators can approve actions';
  END IF;
  
  -- Get the pending action
  SELECT * INTO v_action
  FROM public.pending_actions
  WHERE id = p_action_id AND status = 'Pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending action not found or already processed';
  END IF;
  
  -- Process based on action type
  CASE v_action.action_type
    WHEN 'create_election' THEN
      -- Insert the election with eligible_voters
      INSERT INTO public.elections (
        title,
        description,
        eligible_voters,
        start_date,
        end_date
      ) VALUES (
        v_action.action_data->>'title',
        v_action.action_data->>'description',
        COALESCE(v_action.action_data->>'eligible_voters', 'All Courses'),
        (v_action.action_data->>'start_date')::timestamp with time zone,
        (v_action.action_data->>'end_date')::timestamp with time zone
      ) RETURNING id INTO v_election_id;
      
      -- Handle cover image if already uploaded (new flow)
      IF v_action.action_data ? 'cover_image_url' AND v_action.action_data ? 'temp_image_path' THEN
        -- Generate final file path
        v_temp_path := v_action.action_data->>'temp_image_path';
        v_final_path := v_election_id || '.' || split_part(v_temp_path, '.', -1);
        
        -- Note: Image renaming in storage would need to be handled by the frontend
        -- For now, just use the existing URL structure
        v_cover_url := 'https://fujafrmmyvtsvhqehelx.supabase.co/storage/v1/object/public/election-covers/' || v_final_path;
        
        UPDATE public.elections
        SET cover_image_url = v_action.action_data->>'cover_image_url'
        WHERE id = v_election_id;
      END IF;
      
      -- Create positions if any
      IF v_action.action_data ? 'positions' THEN
        INSERT INTO public.positions (election_id, title, description, max_candidates)
        SELECT 
          v_election_id,
          pos->>'title',
          pos->>'description',
          COALESCE((pos->>'max_candidates')::integer, 10)
        FROM jsonb_array_elements(v_action.action_data->'positions') AS pos;
      END IF;
      
    WHEN 'add_candidate' THEN
      -- Insert the candidate
      INSERT INTO public.candidates (
        election_id,
        position_id,
        full_name,
        bio,
        image_url
      ) VALUES (
        (v_action.action_data->>'election_id')::uuid,
        (v_action.action_data->>'position_id')::uuid,
        v_action.action_data->>'full_name',
        v_action.action_data->>'bio',
        v_action.action_data->>'image_url'
      );
      
    WHEN 'publish_results' THEN
      -- Update election status to completed
      UPDATE public.elections
      SET status = 'Completed'
      WHERE id = (v_action.action_data->>'election_id')::uuid;
      
  END CASE;
  
  -- Mark action as approved
  UPDATE public.pending_actions
  SET 
    status = 'Approved',
    admin_notes = p_admin_notes,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_action_id;
  
  -- Log the approval action
  PERFORM public.log_audit_action(
    auth.uid(),
    'Administrator'::user_role,
    'approve_action',
    'pending_action',
    p_action_id,
    jsonb_build_object(
      'action_type', v_action.action_type,
      'original_requester', v_action.requested_by
    )
  );
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_election_results(p_election_id uuid)
 RETURNS TABLE(election_id uuid, election_title text, position_id uuid, position_title text, candidate_id uuid, candidate_name text, vote_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
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
    FROM public.votes 
    WHERE election_id = p_election_id
    GROUP BY candidate_id
  ) v ON c.id = v.candidate_id
  WHERE e.id = p_election_id
  ORDER BY p.title, v.vote_count DESC NULLS LAST, c.full_name;
$$;

CREATE OR REPLACE FUNCTION public.update_election_statuses()
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

-- Critical: Fix role escalation vulnerability
-- Remove the existing policy that allows users to update their own profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a new policy that excludes the role column
CREATE POLICY "Users can update their own profile (except role)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()) -- Prevent role changes
);

-- Create admin-only policy for role updates
CREATE POLICY "Only admins can update user roles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

-- Create function for admin role changes
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_new_role user_role, p_admin_notes text DEFAULT NULL)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'Administrator'::user_role) THEN
    RAISE EXCEPTION 'Only administrators can update user roles';
  END IF;
  
  -- Update user role
  UPDATE public.profiles
  SET 
    role = p_new_role,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Also update user_roles table
  UPDATE public.user_roles
  SET role = p_new_role
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Insert if doesn't exist
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_new_role);
  END IF;
  
  -- Log the role change
  PERFORM public.log_audit_action(
    auth.uid(),
    'Administrator'::user_role,
    'update_user_role',
    'user_profile',
    p_user_id,
    jsonb_build_object(
      'new_role', p_new_role,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;