CREATE TABLE public.program_sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  name text NOT NULL,
  from_session smallint,
  to_session smallint,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_sequences TO authenticated;
GRANT ALL ON public.program_sequences TO service_role;

ALTER TABLE public.program_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their own sequences"
ON public.program_sequences FOR ALL TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE TRIGGER update_program_sequences_updated_at
BEFORE UPDATE ON public.program_sequences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();