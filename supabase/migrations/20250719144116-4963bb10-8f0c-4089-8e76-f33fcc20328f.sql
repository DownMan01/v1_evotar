-- Fix user_roles table by adding back the role column
ALTER TABLE public.user_roles ADD COLUMN role public.user_role NOT NULL DEFAULT 'Voter';

-- Add unique constraint back  
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- Add the role column back to profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'Voter';
    END IF;
END $$;

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