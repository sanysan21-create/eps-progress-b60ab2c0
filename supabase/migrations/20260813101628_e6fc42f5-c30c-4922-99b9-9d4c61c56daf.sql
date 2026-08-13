CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage their own activities" ON public.activities FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.activity_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_levels TO authenticated;
GRANT ALL ON public.activity_levels TO service_role;
ALTER TABLE public.activity_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage their own activity levels" ON public.activity_levels FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER update_activity_levels_updated_at BEFORE UPDATE ON public.activity_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX activity_levels_activity_idx ON public.activity_levels(activity_id, position);

CREATE TABLE public.student_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  label text NOT NULL,
  level_label text NOT NULL,
  level_position integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_competencies TO authenticated;
GRANT ALL ON public.student_competencies TO service_role;
ALTER TABLE public.student_competencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage their own student competencies" ON public.student_competencies FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER update_student_competencies_updated_at BEFORE UPDATE ON public.student_competencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX student_competencies_student_idx ON public.student_competencies(student_id);