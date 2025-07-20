-- Restore all missing functions that were lost in the CASCADE drop
-- First ensure log_audit_action exists with proper types
CREATE OR REPLACE FUNCTION public.log_audit_action(p_actor_id uuid, p_actor_role public.user_role, p_action text, p_resource_type text DEFAULT NULL::text, p_resource_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Restore update_user_role function
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_new_role public.user_role, p_admin_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'Administrator'::public.user_role) THEN
    RAISE EXCEPTION 'Only administrators can update user roles';
  END IF;
  
  -- Update user role in profiles
  UPDATE public.profiles
  SET 
    role = p_new_role,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Also update user_roles table
  UPDATE public.user_roles
  SET role = p_new_role
  WHERE user_id = p_user_id;
  
  -- If no row was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_new_role);
  END IF;
  
  -- Log the role change
  PERFORM public.log_audit_action(
    auth.uid(),
    'Administrator'::public.user_role,
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