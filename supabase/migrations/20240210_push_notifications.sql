-- Push notification subscriptions table
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  curso_id TEXT REFERENCES cursos(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique subscription per user per course
  CONSTRAINT unique_user_course_subscription UNIQUE(user_id, curso_id)
);

-- Index for faster lookups
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_curso_id ON push_subscriptions(curso_id);
CREATE INDEX idx_push_subscriptions_user_email ON push_subscriptions(user_email);

-- Notification history table
CREATE TABLE notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id TEXT REFERENCES cursos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE
);

-- Index for notification history
CREATE INDEX idx_notification_history_curso_id ON notification_history(curso_id);
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at);

-- Add notification preferences to user profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notification_courses TEXT[] DEFAULT '{}';