
ALTER TABLE intereses
ADD CONSTRAINT unique_email_course UNIQUE (email, course_id);
