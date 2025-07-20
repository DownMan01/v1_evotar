-- Update remaining RLS policies to use correct enum values

-- Drop and recreate candidate policies with correct enum values
DROP POLICY IF EXISTS "Staff and admins can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Staff and admins can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Staff and admins can delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins can delete candidates" ON public.candidates;

-- Create new policies with correct enum case
CREATE POLICY "Staff and admins can insert candidates" ON public.candidates
    FOR INSERT WITH CHECK (
        public.has_role(auth.uid(), 'Administrator'::user_role) OR 
        public.has_role(auth.uid(), 'Staff'::user_role)
    );

CREATE POLICY "Staff and admins can update candidates" ON public.candidates
    FOR UPDATE USING (
        public.has_role(auth.uid(), 'Administrator'::user_role) OR 
        public.has_role(auth.uid(), 'Staff'::user_role)
    );

CREATE POLICY "Staff and admins can delete candidates" ON public.candidates
    FOR DELETE USING (
        public.has_role(auth.uid(), 'Administrator'::user_role) OR 
        public.has_role(auth.uid(), 'Staff'::user_role)
    );

-- Update storage policies for candidate profiles
DROP POLICY IF EXISTS "Staff and admins can upload candidate profiles" ON storage.objects;
DROP POLICY IF EXISTS "Staff and admins can update candidate profiles" ON storage.objects;

CREATE POLICY "Staff and admins can upload candidate profiles" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'candidate-profiles' 
  AND (
    public.has_role(auth.uid(), 'Staff'::user_role) 
    OR public.has_role(auth.uid(), 'Administrator'::user_role)
  )
);

CREATE POLICY "Staff and admins can update candidate profiles" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'candidate-profiles' 
  AND (
    public.has_role(auth.uid(), 'Staff'::user_role) 
    OR public.has_role(auth.uid(), 'Administrator'::user_role)
  )
);

-- Update any remaining profile policies 
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

-- Update elections policies
DROP POLICY IF EXISTS "Only admins can manage elections" ON public.elections;

CREATE POLICY "Only admins can manage elections" 
ON public.elections 
FOR ALL 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

-- Update positions policies
DROP POLICY IF EXISTS "Only admins can manage positions" ON public.positions;

CREATE POLICY "Only admins can manage positions" 
ON public.positions 
FOR ALL 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

-- Update audit logs policies
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

-- Update pending actions policies
DROP POLICY IF EXISTS "Staff can view their own pending actions" ON public.pending_actions;
DROP POLICY IF EXISTS "Staff can create pending actions" ON public.pending_actions;
DROP POLICY IF EXISTS "Admins can view all pending actions" ON public.pending_actions;
DROP POLICY IF EXISTS "Admins can update pending actions" ON public.pending_actions;

CREATE POLICY "Staff can view their own pending actions" 
ON public.pending_actions 
FOR SELECT 
USING (
    public.has_role(auth.uid(), 'Staff'::user_role) AND 
    requested_by = auth.uid()
);

CREATE POLICY "Staff can create pending actions" 
ON public.pending_actions 
FOR INSERT 
WITH CHECK (
    public.has_role(auth.uid(), 'Staff'::user_role) AND 
    requested_by = auth.uid()
);

CREATE POLICY "Admins can view all pending actions" 
ON public.pending_actions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

CREATE POLICY "Admins can update pending actions" 
ON public.pending_actions 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));

-- Update voting session policies
DROP POLICY IF EXISTS "Admins and staff can view all sessions" ON public.voting_sessions;

CREATE POLICY "Admins and staff can view all sessions" 
ON public.voting_sessions 
FOR SELECT 
USING (
    public.has_role(auth.uid(), 'Administrator'::user_role) OR 
    public.has_role(auth.uid(), 'Staff'::user_role)
);

-- Update votes policies  
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

-- Update user_roles policies
DROP POLICY IF EXISTS "Administrators can manage all roles" ON public.user_roles;

CREATE POLICY "Administrators can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'Administrator'::user_role));