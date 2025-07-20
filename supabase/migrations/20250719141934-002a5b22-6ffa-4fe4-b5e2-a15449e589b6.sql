-- First, drop all the problematic functions and recreate them properly
-- Drop duplicate functions
DROP FUNCTION IF EXISTS public.has_role(text);
DROP FUNCTION IF EXISTS public.log_audit_action(uuid, text, text, text, uuid, jsonb);

-- Now ensure we have the correct functions only
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create the log_audit_action function with proper user_role type
CREATE OR REPLACE FUNCTION public.log_audit_action(p_actor_id uuid, p_actor_role user_role, p_action text, p_resource_type text DEFAULT NULL::text, p_resource_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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