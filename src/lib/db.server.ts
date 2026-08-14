/**
 * Accès Postgres direct (aucune dépendance à un backend tiers).
 * Fonctionne sur Cloudflare Workers via postgres.js.
 * Configuration : secret DATABASE_URL (chaîne de connexion Postgres).
 */
import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;
let schemaReady: Promise<void> | null = null;

function connectionString(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL manquant : renseigne la chaîne de connexion Postgres dans les variables d'environnement.",
    );
  }
  return url;
}

function rawClient() {
  if (!client) {
    client = postgres(connectionString(), {
      ssl: "require",
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }
  return client;
}

/** Client SQL prêt à l'emploi (schéma garanti présent). */
export async function db() {
  const sql = rawClient();
  if (!schemaReady) {
    schemaReady = sql.unsafe(SCHEMA_SQL).then(
      () => undefined,
      (error) => {
        schemaReady = null;
        throw error;
      },
    );
  }
  await schemaReady;
  return sql;
}

export type Db = Awaited<ReturnType<typeof db>>;

/** Schéma idempotent appliqué automatiquement à la première requête. */
const SCHEMA_SQL = /* sql */ `
create extension if not exists pgcrypto;

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  first_name text not null default '',
  last_name text not null default '',
  avatar_file_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_files (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  content_type text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  name text not null,
  school_year text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  student_code text not null unique,
  qr_token uuid not null default gen_random_uuid(),
  last_login_at timestamptz,
  as_member boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists class_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists competencies (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  label text not null,
  position integer not null default 0,
  progress_tip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists competency_levels (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  competency_id uuid not null references competencies(id) on delete cascade,
  label text not null,
  position integer not null default 0,
  tip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_competency_levels (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  competency_id uuid not null references competencies(id) on delete cascade,
  level_id uuid not null references competency_levels(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, competency_id)
);

create table if not exists student_engagement (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  indicator_code text not null,
  level smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, indicator_code)
);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  name text not null,
  description text not null default '',
  icon text not null default 'star',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_achievements (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, achievement_id)
);

create table if not exists student_medals (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  medal text not null check (medal in ('bronze', 'silver', 'gold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists student_strength_choices (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  strength_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, strength_code)
);

create table if not exists student_goal_choices (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  goal_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists student_grades (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  evaluated_on date not null default current_date,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_grade_items (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  grade_id uuid not null references student_grades(id) on delete cascade,
  position smallint not null default 0,
  label text not null,
  competency_id uuid references competencies(id) on delete set null,
  points numeric not null default 0,
  max_points numeric not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists program_sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  activity_id uuid references activities(id) on delete set null,
  activity_name text not null default 'Activité',
  session_date date,
  period_label text,
  objective text,
  description text,
  scale_file_id uuid references app_files(id) on delete set null,
  scale_activity_id uuid references activities(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists program_sequences (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  activity_id uuid references activities(id) on delete set null,
  name text not null,
  from_session smallint,
  to_session smallint,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  token_hash text not null,
  active boolean not null default true,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_teacher on students(teacher_id);
create index if not exists idx_class_students_class on class_students(class_id);
create index if not exists idx_qr_tokens_hash on student_qr_tokens(token_hash);
`;

/** Génère un code élève unique (ELV-XXXXXX). */
export async function generateStudentCode(sql: Db): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = `ELV-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const rows = await sql<{ id: string }[]>`
      select id from students where student_code = ${candidate} limit 1
    `;
    if (rows.length === 0) return candidate;
  }
  throw new Error("Impossible de générer un code élève");
}
