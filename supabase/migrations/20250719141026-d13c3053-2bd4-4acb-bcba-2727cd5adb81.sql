-- Fix RLS policies to use correct has_role function with proper enum casting
-- Drop and recreate policies for profiles table
DROP POLICY IF EXISTS "Admins can view all profiles for approval" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles for approval" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles for results" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update user roles" ON public.profiles;

CREATE POLICY "Admins can view all profiles for approval" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

CREATE POLICY "Admins can update profiles for approval" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

CREATE POLICY "Staff can view all profiles for results" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Staff'::user_role));

CREATE POLICY "Only admins can update user roles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

-- Drop and recreate policies for audit_logs table
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

-- Drop and recreate policies for pending_actions table
DROP POLICY IF EXISTS "Staff can view their own pending actions" ON public.pending_actions;
DROP POLICY IF EXISTS "Staff can create pending actions" ON public.pending_actions;
DROP POLICY IF EXISTS "Admins can view all pending actions" ON public.pending_actions;
DROP POLICY IF EXISTS "Admins can update pending actions" ON public.pending_actions;

CREATE POLICY "Staff can view their own pending actions" 
ON public.pending_actions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Staff'::user_role) AND requested_by = auth.uid());

CREATE POLICY "Staff can create pending actions" 
ON public.pending_actions 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'Staff'::user_role) AND requested_by = auth.uid());

CREATE POLICY "Admins can view all pending actions" 
ON public.pending_actions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

CREATE POLICY "Admins can update pending actions" 
ON public.pending_actions 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

-- Drop and recreate policies for voting_sessions table
DROP POLICY IF EXISTS "Admins and staff can view all sessions" ON public.voting_sessions;

CREATE POLICY "Admins and staff can view all sessions" 
ON public.voting_sessions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Administrator'::user_role) OR public.has_role(auth.uid(), 'Staff'::user_role));

-- Drop and recreate policies for votes table
DROP POLICY IF EXISTS "Admins can view all votes" ON public.votes;
DROP POLICY IF EXISTS "Staff can view all votes" ON public.votes;

CREATE POLICY "Admins can view all votes" 
ON public.votes 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

CREATE POLICY "Staff can view all votes" 
ON public.votes 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Staff'::user_role));

-- Drop and recreate policies for user_roles table
DROP POLICY IF EXISTS "Administrators can manage all roles" ON public.user_roles;

CREATE POLICY "Administrators can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));