-- Fix any remaining user_role casting issues in database functions
-- Update all functions to use proper enum casting

CREATE OR REPLACE FUNCTION public.approve_pending_action(p_action_id uuid, p_admin_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_action RECORD;
  v_election_id UUID;
  v_position_id UUID;
  v_cover_url TEXT;
  v_temp_path TEXT;
  v_final_path TEXT;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'Administrator') THEN
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
    'Administrator',
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
$function$;

CREATE OR REPLACE FUNCTION public.reject_pending_action(p_action_id uuid, p_admin_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_action RECORD;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'Administrator') THEN
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
    'Administrator',
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
$function$;

CREATE OR REPLACE FUNCTION public.approve_user_registration(p_user_id uuid, p_admin_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'Administrator') THEN
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
    'Administrator',
    'approve_user_registration',
    'user_profile',
    p_user_id,
    jsonb_build_object(
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_user_registration(p_user_id uuid, p_admin_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'Administrator') THEN
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
    'Administrator',
    'reject_user_registration',
    'user_profile',
    p_user_id,
    jsonb_build_object(
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$function$;

-- Update log_audit_action function to use text instead of enum for role parameter
CREATE OR REPLACE FUNCTION public.log_audit_action(p_actor_id uuid, p_actor_role text, p_action text, p_resource_type text DEFAULT NULL::text, p_resource_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
    p_actor_role::user_role,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  );
END;
$function$;