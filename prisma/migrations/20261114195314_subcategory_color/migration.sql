-- Subcategories share their parent's color (rule enforced by the categories module).
UPDATE "app"."categories" AS child
SET "color" = parent."color"
FROM "app"."categories" AS parent
WHERE child."parentId" = parent."id"
  AND child."color" <> parent."color";
