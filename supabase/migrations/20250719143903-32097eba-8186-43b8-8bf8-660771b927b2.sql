-- Restore the role column to profiles table and fix the damage
ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'Voter';

-- Recreate user_roles table if it was dropped
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.user_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles if not already enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Administrators can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Administrators can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'Administrator'::public.user_role));

-- Populate user_roles table based on profiles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role 
FROM public.profiles 
ON CONFLICT (user_id, role) DO NOTHING;

-- Update all existing users to have default Voter role if they don't have one
UPDATE public.profiles 
SET role = 'Voter'::public.user_role 
WHERE role IS NULL;