INSERT INTO photos (user_id, file_url, category, status, visibility)
SELECT
  p.user_id,
  value AS file_url,
  'profile' AS category,
  'approved' AS status,
  'public' AS visibility
FROM profiles p,
  json_each(CASE WHEN p.photos IS NULL OR p.photos = '' THEN '[]' ELSE p.photos END)
WHERE json_valid(CASE WHEN p.photos IS NULL OR p.photos = '' THEN '[]' ELSE p.photos END);
