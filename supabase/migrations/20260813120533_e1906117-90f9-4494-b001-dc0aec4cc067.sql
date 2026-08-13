-- Notes (évaluations chiffrées AFL) et Programme des séances

CREATE TABLE public.student_grades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  evaluated_on date NOT NULL DEFAULT current_date,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_id, activity_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_grades TO authenticated;
GRANT ALL ON public.student_grades TO service_role;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage their own grades" ON public.student_grades
  FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER update_student_grades_updated_at BEFORE UPDATE ON public.student_grades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_grade_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  grade_id uuid NOT NULL REFERENCES public.student_grades(id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 1,
  label text NOT NULL DEFAULT 'AFL1',
  competency_id uuid REFERENCES public.competencies(id) ON DELETE SET NULL,
  points numeric(5,2) NOT NULL DEFAULT 0,
  max_points numeric(5,2) NOT NULL DEFAULT 20,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (grade_id, position)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_grade_items TO authenticated;
GRANT ALL ON public.student_grade_items TO service_role;
ALTER TABLE public.student_grade_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage their own grade items" ON public.student_grade_items
  FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER update_student_grade_items_updated_at BEFORE UPDATE ON public.student_grade_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.program_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  activity_name text NOT NULL DEFAULT '',
  session_date date,
  period_label text,
  objective text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_sessions TO authenticated;
GRANT ALL ON public.program_sessions TO service_role;
ALTER TABLE public.program_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage their own program" ON public.program_sessions
  FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER update_program_sessions_updated_at BEFORE UPDATE ON public.program_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX student_grades_student_idx ON public.student_grades (student_id);
CREATE INDEX student_grade_items_grade_idx ON public.student_grade_items (grade_id);
CREATE INDEX program_sessions_teacher_date_idx ON public.program_sessions (teacher_id, session_date);
CREATE INDEX program_sessions_class_idx ON public.program_sessions (class_id);