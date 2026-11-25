-- Réglages du référentiel uniquement ; les notes existantes restent intactes.
alter table activities add column if not exists grading_scale jsonb;
alter table competencies add column if not exists max_points numeric;
alter table competencies add column if not exists afl1_part text;