create table if not exists pagos_cursos (
  id bigserial primary key,
  user_id uuid not null,
  curso_id text not null,
  monto numeric(12,2) not null default 0,
  descripcion text,
  periodo text,
  estado text not null check (estado in ('pendiente','pagado','vencido','rechazado')) default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pagos_cursos_user on pagos_cursos(user_id);
create index if not exists idx_pagos_cursos_curso on pagos_cursos(curso_id);
create index if not exists idx_pagos_cursos_estado on pagos_cursos(estado);
create index if not exists idx_pagos_cursos_periodo on pagos_cursos(periodo);

create or replace function set_updated_at_pagos_cursos()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_pagos_cursos on pagos_cursos;
create trigger trg_set_updated_at_pagos_cursos
before update on pagos_cursos
for each row
execute procedure set_updated_at_pagos_cursos();

alter table pagos_cursos enable row level security;

create table if not exists pagos_eventos (
  id bigserial primary key,
  pago_id bigint references pagos_cursos(id) on delete cascade,
  tipo text not null check (tipo in ('orden_creada','pago_confirmado','webhook','error')),
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pagos_eventos_pago on pagos_eventos(pago_id);

alter table pagos_eventos enable row level security;

create or replace view pagos_resumen as
select
  user_id,
  curso_id,
  count(*) filter (where estado = 'pagado') as pagados,
  count(*) filter (where estado <> 'pagado') as pendientes
from pagos_cursos
group by user_id, curso_id;
