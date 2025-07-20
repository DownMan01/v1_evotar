-- Fix the approve and reject user registration functions to use proper types
CREATE OR REPLACE FUNCTION public.approve_user_registration(p_user_id uuid, p_admin_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.reject_user_registration(p_user_id uuid, p_admin_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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