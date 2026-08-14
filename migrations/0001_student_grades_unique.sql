-- Corrige "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- lors de l'enregistrement d'une note : l'upsert utilise ON CONFLICT (student_id, activity_id).

-- 1) Dédoublonnage : on ne garde que la note la plus récente par (élève, activité).
delete from student_grade_items
where grade_id in (
  select id from (
    select id,
           row_number() over (
             partition by student_id, activity_id
             order by updated_at desc, created_at desc, id
           ) as rn
    from student_grades
  ) ranked
  where rn > 1
);

delete from student_grades
where id in (
  select id from (
    select id,
           row_number() over (
             partition by student_id, activity_id
             order by updated_at desc, created_at desc, id
           ) as rn
    from student_grades
  ) ranked
  where rn > 1
);

-- 2) Contrainte unique correspondant exactement au ON CONFLICT.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'student_grades'::regclass
      and conname = 'student_grades_student_activity_key'
  ) then
    alter table student_grades
      add constraint student_grades_student_activity_key unique (student_id, activity_id);
  end if;
end $$;
