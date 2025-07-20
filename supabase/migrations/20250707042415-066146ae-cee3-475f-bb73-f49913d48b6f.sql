-- Add email field to profiles table
ALTER TABLE public.profiles ADD COLUMN email TEXT;

-- Update the handle_new_user function to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, student_id, full_name, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'student_id',
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );
  
  -- Insert default voter role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'voter');
  
  RETURN new;
END;
$$;