-- Cursos
create table if not exists cursos (
  id text primary key,
  titulo text,
  descripcion text,
  nivel text,
  duracion text,
  profesor text,
  orden integer default 0,
  meses integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_cursos_orden on cursos(orden);

-- Relación alumno-curso (inscripciones)
create table if not exists cursos_alumnos (
  user_id uuid not null,
  curso_id text not null,
  estado text not null check (estado in ('pendiente','activo','rechazado')) default 'pendiente',
  created_at timestamptz not null default now(),
  primary key (user_id, curso_id)
);
create index if not exists idx_cursos_alumnos_user on cursos_alumnos(user_id);
create index if not exists idx_cursos_alumnos_curso on cursos_alumnos(curso_id);
create index if not exists idx_cursos_alumnos_estado on cursos_alumnos(estado);

-- Evaluaciones
create table if not exists evaluaciones (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  questions jsonb not null,
  course_name text,
  -- Campos para evaluaciones por material o unidad
  tipo_evaluacion text check (tipo_evaluacion in ('general', 'material', 'unidad')),
  material_id text,
  unidad text,
  created_at timestamptz not null default now()
);

create table if not exists evaluaciones_respuestas (
  id bigserial primary key,
  evaluacion_id uuid not null references evaluaciones(id) on delete cascade,
  user_id uuid not null,
  answers jsonb not null,
  score numeric(5,2),
  created_at timestamptz not null default now()
);
create index if not exists idx_eval_resp_eval on evaluaciones_respuestas(evaluacion_id);
create index if not exists idx_eval_resp_user on evaluaciones_respuestas(user_id);

-- Legajos
create table if not exists estados_legajo (
  id serial primary key,
  nombre text not null unique
);

create table if not exists legajos (
  id bigserial primary key,
  cuit_cuil text not null unique,
  nombre text,
  apellido text,
  foto_url text,
  estado_id integer references estados_legajo(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_legajos_estado on legajos(estado_id);
create index if not exists idx_legajos_apellido on legajos(apellido);

create or replace function set_updated_at_legajos()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_legajos on legajos;
create trigger trg_set_updated_at_legajos
before update on legajos
for each row
execute procedure set_updated_at_legajos();

create table if not exists laboral_seguros (
  id bigserial primary key,
  legajo_id bigint not null references legajos(id) on delete cascade,
  vencimiento_seguros date,
  created_at timestamptz not null default now()
);
create index if not exists idx_seguros_legajo on laboral_seguros(legajo_id);

-- Vista para onboarding de legajos
create or replace view vista_onboarding as
select
  l.id,
  l.cuit_cuil,
  l.nombre,
  l.apellido,
  l.foto_url,
  l.estado_id,
  el.nombre as estado_nombre,
  ls.vencimiento_seguros
from legajos l
left join estados_legajo el on el.id = l.estado_id
left join laboral_seguros ls on ls.legajo_id = l.id;

-- Logs de ingresos de alumnos (para estadísticas)
create table if not exists alumnos_ingresos (
  id bigserial primary key,
  email text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ingresos_created_at on alumnos_ingresos(created_at);

-- Intereses de cursos (contactos)
create table if not exists intereses (
  id bigserial primary key,
  email text not null,
  course_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_intereses_course on intereses(course_id);
create index if not exists idx_intereses_email_created on intereses(email, created_at);
