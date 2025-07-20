-- Enable RLS and create policies for user_roles
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

-- Create an admin user by updating the first user in the database to be an Administrator
-- Get the first user and make them admin
DO $$
DECLARE
    first_user_id uuid;
BEGIN
    SELECT user_id INTO first_user_id FROM public.profiles LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Update their role in profiles
        UPDATE public.profiles 
        SET role = 'Administrator'::public.user_role 
        WHERE user_id = first_user_id;
        
        -- Update their role in user_roles
        UPDATE public.user_roles 
        SET role = 'Administrator'::public.user_role 
        WHERE user_id = first_user_id;
        
        -- If no entry in user_roles, insert one
        INSERT INTO public.user_roles (user_id, role)
        VALUES (first_user_id, 'Administrator'::public.user_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;