-- Fonction utilitaire updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Génération d'un code élève unique lisible
CREATE OR REPLACE FUNCTION public.generate_student_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := 'ELV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.students s WHERE s.student_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- CLASSES
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  school_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their own classes"
ON public.classes FOR ALL TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

CREATE INDEX classes_teacher_idx ON public.classes (teacher_id, name);

CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STUDENTS
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  student_code TEXT NOT NULL UNIQUE DEFAULT public.generate_student_code(),
  qr_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their own students"
ON public.students FOR ALL TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

CREATE INDEX students_teacher_idx ON public.students (teacher_id, last_name, first_name);

CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CLASS <-> STUDENT
CREATE TABLE public.class_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_students TO authenticated;
GRANT ALL ON public.class_students TO service_role;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their own enrollments"
ON public.class_students FOR ALL TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

CREATE INDEX class_students_class_idx ON public.class_students (class_id);
CREATE INDEX class_students_student_idx ON public.class_students (student_id);

CREATE TRIGGER update_class_students_updated_at
BEFORE UPDATE ON public.class_students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();