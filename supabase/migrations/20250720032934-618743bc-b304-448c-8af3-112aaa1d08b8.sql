-- Create function to check for duplicate email or student ID
CREATE OR REPLACE FUNCTION public.check_duplicate_user(p_email text, p_student_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email_exists boolean := false;
  v_student_id_exists boolean := false;
BEGIN
  -- Check if email exists in profiles
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = p_email
  ) INTO v_email_exists;
  
  -- Check if student_id exists in profiles  
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE student_id = p_student_id
  ) INTO v_student_id_exists;
  
  RETURN jsonb_build_object(
    'email_exists', v_email_exists,
    'student_id_exists', v_student_id_exists,
    'has_duplicates', (v_email_exists OR v_student_id_exists)
  );
END;
$$;

-- Create function to handle user appeals (for rejected users to resubmit)
CREATE OR REPLACE FUNCTION public.submit_user_appeal(
  p_user_id uuid,
  p_new_student_id text,
  p_new_full_name text,
  p_new_course text,
  p_new_year_level text,
  p_new_gender text,
  p_new_id_image_url text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if user exists and is rejected
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = p_user_id 
    AND registration_status = 'Rejected'
  ) THEN
    RAISE EXCEPTION 'User not found or not in rejected status';
  END IF;
  
  -- Check for duplicates with new data
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE student_id = p_new_student_id 
    AND user_id != p_user_id
  ) THEN
    RAISE EXCEPTION 'Student ID already exists';
  END IF;
  
  -- Update profile with new information and reset to pending
  UPDATE public.profiles
  SET 
    student_id = p_new_student_id,
    full_name = p_new_full_name,
    course = p_new_course,
    year_level = p_new_year_level,
    gender = p_new_gender,
    id_image_url = p_new_id_image_url,
    registration_status = 'Pending',
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log the appeal action
  PERFORM public.log_audit_action(
    p_user_id,
    'Voter'::public.user_role,
    'submit_appeal',
    'user_profile',
    p_user_id,
    jsonb_build_object(
      'new_student_id', p_new_student_id,
      'action', 'resubmit_credentials'
    )
  );
  
  RETURN TRUE;
END;
$$;