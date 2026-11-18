-- The app uses server-side PostgreSQL, not browser Supabase Data API access.
-- Remove public schema access from default/public roles to protect future objects
-- even when Supabase-admin-owned default grants are applied to a newly created table.
REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC, anon, authenticated;
