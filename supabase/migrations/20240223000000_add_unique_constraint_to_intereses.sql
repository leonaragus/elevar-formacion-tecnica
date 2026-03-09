
ALTER TABLE intereses
DROP CONSTRAINT IF EXISTS unique_email_course;

ALTER TABLE intereses
ADD CONSTRAINT unique_email_course UNIQUE (email, course_id);
