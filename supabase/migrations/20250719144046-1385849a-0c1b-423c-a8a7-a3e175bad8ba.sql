-- Fix user_roles table by adding back the role column
ALTER TABLE public.user_roles ADD COLUMN role public.user_role NOT NULL DEFAULT 'Voter';

-- Add the role column back to profiles  
ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'Voter';

-- Populate user_roles with default data for all existing users
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'Voter'::public.user_role 
FROM public.profiles 
ON CONFLICT (user_id, role) DO NOTHING;

-- Now recreate the has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Enable RLS and create policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Administrators can manage all roles" ON public.user_roles;

-- Recreate policies
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Administrators can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'Administrator'::public.user_role));