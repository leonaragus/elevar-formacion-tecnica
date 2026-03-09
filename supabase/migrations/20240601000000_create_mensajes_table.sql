
create table if not exists mensajes (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  contenido text not null,
  curso_id uuid references cursos(id) on delete cascade,
  created_at timestamptz default now()
);

-- Enable RLS
alter table mensajes enable row level security;

-- Policies (Idempotent)
DROP POLICY IF EXISTS "Public read access" ON mensajes;
DROP POLICY IF EXISTS "Admin all access" ON mensajes;

create policy "Public read access" on mensajes for select using (true);
create policy "Admin all access" on mensajes for all using (true);
