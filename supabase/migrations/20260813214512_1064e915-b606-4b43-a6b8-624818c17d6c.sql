ALTER TABLE public.competency_levels ADD COLUMN IF NOT EXISTS tip text;

ALTER TABLE public.program_sessions ADD COLUMN IF NOT EXISTS scale_activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL;

CREATE TABLE public.student_medals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  medal text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_medals TO authenticated;
GRANT ALL ON public.student_medals TO service_role;

ALTER TABLE public.student_medals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their own student medals" ON public.student_medals
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE TRIGGER update_student_medals_updated_at
  BEFORE UPDATE ON public.student_medals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_student_medal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.medal NOT IN ('bronze', 'silver', 'gold') THEN
    RAISE EXCEPTION 'Médaille invalide: %', NEW.medal;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_student_medal_before_write
  BEFORE INSERT OR UPDATE ON public.student_medals
  FOR EACH ROW EXECUTE FUNCTION public.validate_student_medal();