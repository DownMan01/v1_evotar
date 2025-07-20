-- Fix remaining functions that still use ::user_role casting
CREATE OR REPLACE FUNCTION public.cast_anonymous_vote(p_session_token text, p_candidate_id uuid, p_election_id uuid, p_position_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
    'Voter',
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
$function$;

CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_new_role user_role, p_admin_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'Administrator') THEN
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
    'Administrator',
    'update_user_role',
    'user_profile',
    p_user_id,
    jsonb_build_object(
      'new_role', p_new_role::text,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$function$;