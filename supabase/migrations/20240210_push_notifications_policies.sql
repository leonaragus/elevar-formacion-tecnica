-- Enable RLS on push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own subscriptions
CREATE POLICY "Users can update own subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on notification_history
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Users can see notifications sent to them
CREATE POLICY "Users can view own notifications" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

-- Only admins can insert notification history (through backend)
CREATE POLICY "Admins can insert notification history" ON notification_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email IN (SELECT email FROM profiles WHERE role = 'admin')
    )
  );

-- Function to get user subscriptions
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  curso_id TEXT,
  curso_titulo TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    ps.id,
    ps.curso_id,
    c.titulo as curso_titulo,
    ps.created_at
  FROM push_subscriptions ps
  JOIN cursos c ON ps.curso_id = c.id
  WHERE ps.user_id = user_uuid
  ORDER BY ps.created_at DESC;
$$;

-- Function to get course subscribers
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
  WHERE curso_id = course_id
  AND user_id IN (
    SELECT user_id 
    FROM cursos_alumnos 
    WHERE curso_id = course_id 
    AND estado IN ('activo', 'pendiente')
  );
$$;

-- Function to clean expired subscriptions
CREATE OR REPLACE FUNCTION cleanup_expired_subscriptions()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM push_subscriptions
  WHERE id IN (
    SELECT ps.id
    FROM push_subscriptions ps
    LEFT JOIN auth.users u ON ps.user_id = u.id
    WHERE u.id IS NULL
    OR ps.created_at < NOW() - INTERVAL '1 year'
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;