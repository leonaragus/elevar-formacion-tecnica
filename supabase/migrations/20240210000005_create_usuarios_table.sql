-- Crea la tabla para perfiles de usuario
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT,
    apellido TEXT,
    role TEXT NOT NULL DEFAULT 'alumno',
    status TEXT NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilita RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Trigger para actualizar 'updated_at'
CREATE OR REPLACE FUNCTION set_updated_at_usuarios()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_updated_at_usuarios
BEFORE UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at_usuarios();

-- Políticas de RLS
CREATE POLICY "Los perfiles públicos son visibles para todos."
ON public.usuarios FOR SELECT
USING ( true );

CREATE POLICY "Los usuarios pueden insertar su propio perfil."
ON public.usuarios FOR INSERT
WITH CHECK ( auth.uid() = id );

CREATE POLICY "Los usuarios pueden actualizar su propio perfil."
ON public.usuarios FOR UPDATE
USING ( auth.uid() = id );

CREATE POLICY "Los administradores tienen acceso total."
ON public.usuarios FOR ALL
USING ( (get_my_claim('user_role')) = '"admin"'::jsonb )
WITH CHECK ( (get_my_claim('user_role')) = '"admin"'::jsonb );
