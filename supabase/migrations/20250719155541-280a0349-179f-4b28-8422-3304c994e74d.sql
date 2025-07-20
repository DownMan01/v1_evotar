-- Fix account creation by recreating the trigger and ensuring proper profile/user_roles creation

-- First, recreate the handle_new_user function to ensure it works with the current schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (
    user_id, 
    student_id, 
    full_name, 
    email, 
    registration_status,
    course,
    year_level,
    gender,
    id_image_url,
    role
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'student_id',
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    'Pending',
    new.raw_user_meta_data ->> 'course',
    new.raw_user_meta_data ->> 'year_level',
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'id_image_url',
    'Voter'::public.user_role
  );
  
  -- Insert default voter role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'Voter'::public.user_role);
  
  RETURN new;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();