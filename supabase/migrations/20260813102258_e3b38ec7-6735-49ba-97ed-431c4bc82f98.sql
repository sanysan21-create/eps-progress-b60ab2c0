DROP TABLE IF EXISTS public.student_competencies;
DROP TABLE IF EXISTS public.activity_levels;

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS description text;

CREATE TABLE public.competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competencies TO authenticated;
GRANT ALL ON public.competencies TO service_role;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage their own competencies" ON public.competencies FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER update_competencies_updated_at BEFORE UPDATE ON public.competencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX competencies_activity_idx ON public.competencies(activity_id, position);

CREATE TABLE public.competency_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competency_levels TO authenticated;
GRANT ALL ON public.competency_levels TO service_role;
ALTER TABLE public.competency_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage their own competency levels" ON public.competency_levels FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER update_competency_levels_updated_at BEFORE UPDATE ON public.competency_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX competency_levels_competency_idx ON public.competency_levels(competency_id, position);

CREATE TABLE public.student_competency_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  level_id uuid NOT NULL REFERENCES public.competency_levels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, competency_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_competency_levels TO authenticated;
GRANT ALL ON public.student_competency_levels TO service_role;
ALTER TABLE public.student_competency_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage their own student levels" ON public.student_competency_levels FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER update_student_competency_levels_updated_at BEFORE UPDATE ON public.student_competency_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX student_competency_levels_student_idx ON public.student_competency_levels(student_id);