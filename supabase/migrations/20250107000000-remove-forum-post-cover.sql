-- Remove forum post cover image field
-- Posts should only have content images (for screenshots, examples, etc.)

ALTER TABLE forum_posts DROP COLUMN IF EXISTS cover_image_url; 