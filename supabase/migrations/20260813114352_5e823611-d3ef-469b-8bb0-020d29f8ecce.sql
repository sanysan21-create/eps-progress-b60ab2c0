DROP TABLE IF EXISTS public.student_strengths;

CREATE TABLE public.student_strength_choices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strength_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.student_strength_choices TO authenticated;
GRANT ALL ON public.student_strength_choices TO service_role;

ALTER TABLE public.student_strength_choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers read their own students strength choice"
ON public.student_strength_choices
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

CREATE TRIGGER update_student_strength_choices_updated_at
BEFORE UPDATE ON public.student_strength_choices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();