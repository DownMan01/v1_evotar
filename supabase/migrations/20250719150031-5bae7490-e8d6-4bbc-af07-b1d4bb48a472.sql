-- Restore missing RLS policies for all tables

-- ======================
-- PENDING ACTIONS POLICIES
-- ======================
CREATE POLICY "Staff and admins can view all pending actions" 
ON public.pending_actions 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
  public.has_role(auth.uid(), 'Staff'::public.user_role)
);

CREATE POLICY "Staff and admins can create pending actions" 
ON public.pending_actions 
FOR INSERT 
WITH CHECK (
  public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
  public.has_role(auth.uid(), 'Staff'::public.user_role)
);

CREATE POLICY "Admins can update pending actions" 
ON public.pending_actions 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'Administrator'::public.user_role));

CREATE POLICY "Admins can delete pending actions" 
ON public.pending_actions 
FOR DELETE 
USING (public.has_role(auth.uid(), 'Administrator'::public.user_role));

-- ======================
-- ELECTION RESULTS POLICIES
-- ======================
CREATE POLICY "Everyone can view election results" 
ON public.election_results 
FOR SELECT 
USING (true);

-- ======================
-- CANDIDATES MANAGEMENT POLICIES
-- ======================
CREATE POLICY "Staff and admins can insert candidates" 
ON public.candidates
FOR INSERT 
WITH CHECK (
  public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
  public.has_role(auth.uid(), 'Staff'::public.user_role)
);

CREATE POLICY "Staff and admins can update candidates" 
ON public.candidates
FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
  public.has_role(auth.uid(), 'Staff'::public.user_role)
);

CREATE POLICY "Staff and admins can delete candidates" 
ON public.candidates
FOR DELETE 
USING (
  public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
  public.has_role(auth.uid(), 'Staff'::public.user_role)
);

-- ======================
-- ELECTIONS MANAGEMENT POLICIES
-- ======================
CREATE POLICY "Staff and admins can insert elections" 
ON public.elections
FOR INSERT 
WITH CHECK (
  public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
  public.has_role(auth.uid(), 'Staff'::public.user_role)
);

CREATE POLICY "Staff and admins can update elections" 
ON public.elections
FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
  public.has_role(auth.uid(), 'Staff'::public.user_role)
);

CREATE POLICY "Staff and admins can delete elections" 
ON public.elections
FOR DELETE 
USING (
  public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
  public.has_role(auth.uid(), 'Staff'::public.user_role)
);

-- ======================
-- POSITIONS MANAGEMENT POLICIES
-- ======================
CREATE POLICY "Staff and admins can insert positions" 
ON public.positions
FOR INSERT 
WITH CHECK (
  public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
  public.has_role(auth.uid(), 'Staff'::public.user_role)
);

CREATE POLICY "Staff and admins can update positions" 
ON public.positions
FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
  public.has_role(auth.uid(), 'Staff'::public.user_role)
);

CREATE POLICY "Staff and admins can delete positions" 
ON public.positions
FOR DELETE 
USING (
  public.has_role(auth.uid(), 'Administrator'::public.user_role) OR 
  public.has_role(auth.uid(), 'Staff'::public.user_role)
);

-- ======================
-- PROFILES ADMIN POLICIES
-- ======================
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Administrator'::public.user_role));

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'Administrator'::public.user_role));

-- ======================
-- AUDIT LOGS POLICIES
-- ======================
CREATE POLICY "Admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'Administrator'::public.user_role));