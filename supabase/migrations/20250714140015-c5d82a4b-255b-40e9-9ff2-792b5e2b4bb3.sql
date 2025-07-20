-- Fix Phase 1: Core Authentication & User Management

-- Add missing registration_status column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'pending';

-- Update the handle_new_user function to properly set registration status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, student_id, full_name, email, registration_status)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'student_id',
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    'pending'
  );
  
  -- Insert default voter role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'voter');
  
  RETURN new;
END;
$$;

-- Add function to approve user registration
CREATE OR REPLACE FUNCTION public.approve_user_registration(
  p_user_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'administrator'::user_role) THEN
    RAISE EXCEPTION 'Only administrators can approve user registrations';
  END IF;
  
  -- Update registration status to approved
  UPDATE public.profiles
  SET 
    registration_status = 'approved',
    updated_at = now()
  WHERE user_id = p_user_id AND registration_status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or already processed';
  END IF;
  
  -- Log the approval action
  PERFORM public.log_audit_action(
    auth.uid(),
    'administrator'::user_role,
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

-- Add function to reject user registration
CREATE OR REPLACE FUNCTION public.reject_user_registration(
  p_user_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'administrator'::user_role) THEN
    RAISE EXCEPTION 'Only administrators can reject user registrations';
  END IF;
  
  -- Update registration status to rejected
  UPDATE public.profiles
  SET 
    registration_status = 'rejected',
    updated_at = now()
  WHERE user_id = p_user_id AND registration_status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or already processed';
  END IF;
  
  -- Log the rejection action
  PERFORM public.log_audit_action(
    auth.uid(),
    'administrator'::user_role,
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

-- Add RLS policy for admins to view all profiles for approval purposes
CREATE POLICY "Admins can view all profiles for approval" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'administrator'::user_role));

-- Add RLS policy for admins to update user profiles for approval
CREATE POLICY "Admins can update profiles for approval" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'administrator'::user_role));