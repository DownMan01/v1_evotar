-- Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    student_id, 
    full_name, 
    email, 
    registration_status,
    course,
    year_level,
    gender,
    id_image_url
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'student_id',
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    'pending',
    new.raw_user_meta_data ->> 'course',
    new.raw_user_meta_data ->> 'year_level',
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'id_image_url'
  );
  
  -- Insert default voter role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'voter');
  
  RETURN new;
END;
$function$;