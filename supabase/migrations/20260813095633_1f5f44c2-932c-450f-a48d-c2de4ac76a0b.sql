CREATE TABLE public.student_qr_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX student_qr_tokens_one_active_per_student
  ON public.student_qr_tokens (student_id)
  WHERE active;

CREATE INDEX student_qr_tokens_student_id_idx ON public.student_qr_tokens (student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_qr_tokens TO authenticated;
GRANT ALL ON public.student_qr_tokens TO service_role;

ALTER TABLE public.student_qr_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their own student QR tokens"
  ON public.student_qr_tokens FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE TRIGGER update_student_qr_tokens_updated_at
  BEFORE UPDATE ON public.student_qr_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();