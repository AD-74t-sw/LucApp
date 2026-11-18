-- The `app` schema is private to the server: Supabase's Data API roles must
-- never read it, even if someone later adds `app` to the exposed schemas.
-- Guarded so the migration also runs on a plain Postgres (e.g. CI) without those roles.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA app FROM anon, authenticated;
    REVOKE ALL ON ALL TABLES IN SCHEMA app FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON TABLES FROM anon, authenticated;
  END IF;
END
$$;
