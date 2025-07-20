-- Step 1: Add the role column back to profiles
ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'Voter';

-- Step 2: Create user_roles table without the has_role dependency yet
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.user_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Step 3: Populate user_roles with default data
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'Voter'::public.user_role 
FROM public.profiles 
ON CONFLICT (user_id, role) DO NOTHING;