-- Fix update_user_role function to use proper user_role enum
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_new_role user_role, p_admin_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
      'new_role', p_new_role::text,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$$;