UPDATE trainers
SET is_published = TRUE
WHERE is_published IS DISTINCT FROM TRUE;
