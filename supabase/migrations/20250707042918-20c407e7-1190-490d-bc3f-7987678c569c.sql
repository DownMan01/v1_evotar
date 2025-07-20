-- Create a security definer function to get email by student ID for login
CREATE OR REPLACE FUNCTION public.get_email_by_student_id(_student_id TEXT)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT email
  FROM public.profiles
  WHERE student_id = _student_id
  LIMIT 1;
$$;