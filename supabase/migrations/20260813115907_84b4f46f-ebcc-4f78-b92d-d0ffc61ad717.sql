-- Autoriser jusqu'à 3 points forts par élève
ALTER TABLE public.student_strength_choices
  DROP CONSTRAINT IF EXISTS student_strength_choices_student_id_key;
ALTER TABLE public.student_strength_choices
  ADD CONSTRAINT student_strength_choices_student_strength_key UNIQUE (student_id, strength_code);

-- Objectif (point à travailler) choisi par l'élève
CREATE TABLE public.student_goal_choices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE UNIQUE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.student_goal_choices TO authenticated;
GRANT ALL ON public.student_goal_choices TO service_role;

ALTER TABLE public.student_goal_choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers read their own students goal choice"
ON public.student_goal_choices
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

CREATE TRIGGER update_student_goal_choices_updated_at
BEFORE UPDATE ON public.student_goal_choices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();