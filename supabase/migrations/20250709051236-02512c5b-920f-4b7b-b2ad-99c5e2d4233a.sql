-- Create audit_logs table for tracking system actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role user_role NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'administrator'::user_role));

CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Create voting_sessions table for anonymous voting
CREATE TABLE public.voting_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  has_voted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  UNIQUE(voter_id, election_id)
);

-- Enable RLS
ALTER TABLE public.voting_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for voting sessions
CREATE POLICY "Users can view their own sessions" 
ON public.voting_sessions 
FOR SELECT 
USING (auth.uid() = voter_id);

CREATE POLICY "Users can create their own sessions" 
ON public.voting_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Users can update their own sessions" 
ON public.voting_sessions 
FOR UPDATE 
USING (auth.uid() = voter_id);

CREATE POLICY "Admins and staff can view all sessions" 
ON public.voting_sessions 
FOR SELECT 
USING (
  has_role(auth.uid(), 'administrator'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role)
);

-- Create anonymous_votes table for storing votes without voter identity
CREATE TABLE public.anonymous_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (session_token) REFERENCES public.voting_sessions(session_token) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.anonymous_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous votes
CREATE POLICY "Admins can view all anonymous votes" 
ON public.anonymous_votes 
FOR SELECT 
USING (has_role(auth.uid(), 'administrator'::user_role));

CREATE POLICY "System can insert anonymous votes" 
ON public.anonymous_votes 
FOR INSERT 
WITH CHECK (true);

-- Add election status check constraint
ALTER TABLE public.elections 
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE public.elections 
ADD CONSTRAINT valid_status 
CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled'));

-- Add voter registration approval status to profiles
ALTER TABLE public.profiles 
ADD COLUMN registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected'));

-- Create function to log audit actions
CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_actor_id UUID,
  p_actor_role user_role,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to generate voting session token
CREATE OR REPLACE FUNCTION public.create_voting_session(
  p_election_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_token TEXT;
  v_voter_id UUID;
BEGIN
  -- Get current user
  v_voter_id := auth.uid();
  
  IF v_voter_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Generate unique session token
  v_session_token := encode(gen_random_bytes(32), 'hex');
  
  -- Insert or update voting session
  INSERT INTO public.voting_sessions (
    session_token,
    voter_id,
    election_id
  ) VALUES (
    v_session_token,
    v_voter_id,
    p_election_id
  )
  ON CONFLICT (voter_id, election_id) 
  DO UPDATE SET 
    session_token = v_session_token,
    created_at = now(),
    expires_at = now() + INTERVAL '24 hours'
  WHERE voting_sessions.has_voted = FALSE;
  
  RETURN v_session_token;
END;
$$;

-- Create function to cast anonymous vote
CREATE OR REPLACE FUNCTION public.cast_anonymous_vote(
  p_session_token TEXT,
  p_candidate_id UUID,
  p_election_id UUID,
  p_position_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_record RECORD;
BEGIN
  -- Verify session exists and is valid
  SELECT * INTO v_session_record
  FROM public.voting_sessions
  WHERE session_token = p_session_token
    AND election_id = p_election_id
    AND expires_at > now()
    AND has_voted = FALSE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired voting session';
  END IF;
  
  -- Insert anonymous vote
  INSERT INTO public.anonymous_votes (
    session_token,
    candidate_id,
    election_id,
    position_id
  ) VALUES (
    p_session_token,
    p_candidate_id,
    p_election_id,
    p_position_id
  );
  
  -- Mark session as used
  UPDATE public.voting_sessions
  SET has_voted = TRUE
  WHERE session_token = p_session_token;
  
  -- Log the voting action (without revealing voter identity)
  PERFORM public.log_audit_action(
    NULL, -- No actor_id to maintain anonymity
    'voter'::user_role,
    'cast_vote',
    'election',
    p_election_id,
    jsonb_build_object(
      'position_id', p_position_id,
      'candidate_id', p_candidate_id
    )
  );
  
  RETURN TRUE;
END;
$$;