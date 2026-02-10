-- Agregar políticas de seguridad (RLS)

-- Habilitar RLS en las tablas
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Políticas para push_subscriptions
CREATE POLICY "Users can view own subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para notification_history
CREATE POLICY "Users can view own notifications" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

-- Función para obtener suscriptores de un curso
CREATE OR REPLACE FUNCTION get_course_subscribers(course_id TEXT)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT
) LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    user_id,
    user_email,
    endpoint,
    p256dh,
    auth
  FROM push_subscriptions
  WHERE curso_id = course_id;
$$;