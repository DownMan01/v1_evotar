-- Update approve_pending_action function to handle cover images and eligible voters
CREATE OR REPLACE FUNCTION public.approve_pending_action(
  p_action_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action RECORD;
  v_election_id UUID;
  v_position_id UUID;
  v_cover_url TEXT;
  v_file_ext TEXT;
  v_file_name TEXT;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'Administrator'::user_role) THEN
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
      
      -- Handle cover image if provided
      IF v_action.action_data ? 'cover_image_filename' AND v_action.action_data ? 'cover_image_data' THEN
        -- Generate file path for the cover image
        v_file_ext := split_part(v_action.action_data->>'cover_image_filename', '.', -1);
        v_file_name := v_election_id || '.' || v_file_ext;
        
        -- Update election with cover image URL (will be uploaded by frontend)
        v_cover_url := 'https://fujafrmmyvtsvhqehelx.supabase.co/storage/v1/object/public/election-covers/' || v_file_name;
        
        UPDATE public.elections
        SET cover_image_url = v_cover_url
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