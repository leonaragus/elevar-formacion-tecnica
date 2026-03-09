-- Tabla para fechas de entrega
CREATE TABLE calendario_entregas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id TEXT REFERENCES cursos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_entrega TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo_entrega TEXT NOT NULL CHECK (tipo_entrega IN ('trabajo_practico', 'proyecto', 'examen', 'tarea', 'otro')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activo BOOLEAN DEFAULT TRUE
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_calendario_curso_id ON calendario_entregas(curso_id);
CREATE INDEX idx_calendario_fecha_entrega ON calendario_entregas(fecha_entrega);
CREATE INDEX idx_calendario_activo ON calendario_entregas(activo);

-- Tabla para registrar la entrega de los alumnos
CREATE TABLE entregas_alumnos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entrega_id UUID REFERENCES calendario_entregas(id) ON DELETE CASCADE,
  alumno_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'entregado', 'atrasado', 'calificado')),
  fecha_entrega TIMESTAMP WITH TIME ZONE,
  nota DECIMAL(5,2),
  observaciones TEXT,
  archivo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un alumno solo puede tener una entrega por fecha de entrega
  CONSTRAINT unique_alumno_entrega UNIQUE(alumno_id, entrega_id)
);

-- Índices para entregas de alumnos
CREATE INDEX idx_entregas_alumno_id ON entregas_alumnos(alumno_id);
CREATE INDEX idx_entregas_entrega_id ON entregas_alumnos(entrega_id);
CREATE INDEX idx_entregas_estado ON entregas_alumnos(estado);

-- Tabla para recordatorios automáticos
CREATE TABLE recordatorios_entregas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entrega_id UUID REFERENCES calendario_entregas(id) ON DELETE CASCADE,
  tipo_recordatorio TEXT NOT NULL CHECK (tipo_recordatorio IN ('7_dias', '3_dias', '1_dia', 'mismo_dia')),
  enviado BOOLEAN DEFAULT FALSE,
  fecha_envio TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para recordatorios no enviados
CREATE INDEX idx_recordatorios_no_enviados ON recordatorios_entregas(enviado) WHERE enviado = FALSE;

-- Políticas RLS para calendario de entregas
ALTER TABLE calendario_entregas ENABLE ROW LEVEL SECURITY;

-- Administradores y profesores pueden ver todas las fechas de entrega
CREATE POLICY "Admin y profesores pueden ver todas las entregas" ON calendario_entregas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'profesor')
    )
  );

-- Administradores y profesores pueden crear/editar fechas de entrega
CREATE POLICY "Admin y profesores pueden gestionar entregas" ON calendario_entregas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'profesor')
    )
  );

-- Alumnos solo pueden ver las fechas de entrega de sus cursos
-- CREATE POLICY "Alumnos pueden ver entregas de sus cursos" ON calendario_entregas
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM inscripciones_cursos 
--       WHERE alumno_id = auth.uid() 
--       AND curso_id = calendario_entregas.curso_id
--       AND estado = 'aprobado'
--     )
--   );

-- Políticas RLS para entregas de alumnos
ALTER TABLE entregas_alumnos ENABLE ROW LEVEL SECURITY;

-- Alumnos pueden ver y gestionar solo sus propias entregas
CREATE POLICY "Alumnos pueden ver sus entregas" ON entregas_alumnos
  FOR SELECT USING (alumno_id = auth.uid());

CREATE POLICY "Alumnos pueden crear sus entregas" ON entregas_alumnos
  FOR INSERT WITH CHECK (alumno_id = auth.uid());

CREATE POLICY "Alumnos pueden actualizar sus entregas" ON entregas_alumnos
  FOR UPDATE USING (alumno_id = auth.uid());

-- Administradores y profesores pueden ver todas las entregas de sus cursos
CREATE POLICY "Admin y profesores pueden ver entregas de sus cursos" ON entregas_alumnos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios p
      JOIN calendario_entregas ce ON ce.id = entregas_alumnos.entrega_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'profesor')
    )
  );

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_calendario_entregas_updated_at 
  BEFORE UPDATE ON calendario_entregas 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entregas_alumnos_updated_at 
  BEFORE UPDATE ON entregas_alumnos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();