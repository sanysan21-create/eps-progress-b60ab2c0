CREATE TABLE IF NOT EXISTS public.acrosport_music_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  url text NOT NULL CHECK (length(url) <= 2000 AND url ~ '^https?://'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.acrosport_music_proposals TO CURRENT_USER;
REVOKE ALL ON public.acrosport_music_proposals FROM PUBLIC;
ALTER TABLE public.acrosport_music_proposals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS acrosport_music_class_activity
  ON public.acrosport_music_proposals(class_id, activity_id);