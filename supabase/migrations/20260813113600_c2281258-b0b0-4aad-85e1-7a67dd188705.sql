CREATE TABLE public.student_engagement (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  indicator_code text NOT NULL,
  level smallint NOT NULL CHECK (level BETWEEN 1 AND 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, indicator_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_engagement TO authenticated;
GRANT ALL ON public.student_engagement TO service_role;
ALTER TABLE public.student_engagement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage their own engagement records" ON public.student_engagement FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER update_student_engagement_updated_at BEFORE UPDATE ON public.student_engagement FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_strengths (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  strength_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, strength_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_strengths TO authenticated;
GRANT ALL ON public.student_strengths TO service_role;
ALTER TABLE public.student_strengths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage their own strength records" ON public.student_strengths FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER update_student_strengths_updated_at BEFORE UPDATE ON public.student_strengths FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();