-- Tabla para valoraciones de clases (estrellas)
CREATE TABLE IF NOT EXISTS clases_valoraciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clase_id UUID REFERENCES clases_grabadas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  valoracion INTEGER CHECK (valoracion >= 1 AND valoracion <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clase_id, user_id)
);

-- Políticas RLS
ALTER TABLE clases_valoraciones ENABLE ROW LEVEL SECURITY;

-- Lectura pública (para mostrar promedio)
CREATE POLICY "Valoraciones visibles para todos" ON clases_valoraciones
  FOR SELECT USING (true);

-- Insertar solo autenticados
CREATE POLICY "Usuarios pueden valorar" ON clases_valoraciones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Actualizar propia valoración
CREATE POLICY "Usuarios pueden actualizar su valoración" ON clases_valoraciones
  FOR UPDATE USING (auth.uid() = user_id);
