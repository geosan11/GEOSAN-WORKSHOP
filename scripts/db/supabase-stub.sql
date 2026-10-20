-- Minimal stand-in for the parts of a Supabase database the lock migration
-- relies on. Used only by run-lock-test.sh against a throwaway local
-- Postgres; never run this against a real Supabase project.
-- Must be run by a superuser (the test cluster's bootstrap user).

-- Roles, matching Supabase: postgres owns the schema and has BYPASSRLS but
-- is not a superuser; service_role bypasses RLS; anon/authenticated don't.
create role postgres login createrole bypassrls;
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit;
grant anon, authenticated, service_role to authenticator;
grant anon, authenticated, service_role to postgres;

grant create on database postgres to postgres;
alter schema public owner to postgres;
grant usage on schema public to anon, authenticated, service_role;

-- Supabase's default grants: anything postgres creates in public is fully
-- granted to the API roles (this is what the migration has to undo).
alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated, service_role;

-- auth.uid(), same definition Supabase uses: reads the JWT "sub" claim that
-- PostgREST puts in request.jwt.claims for each request.
create schema auth;
grant usage on schema auth to anon, authenticated, service_role, postgres;
create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant execute on function auth.uid() to public;

-- auth.users, reduced to the columns used here. On hosted Supabase the
-- postgres role has ALL on auth tables (supabase/postgres migration
-- 20211115181400_update-auth-permissions.sql), which includes REFERENCES,
-- so app_owner can have a foreign key to it.
create table auth.users (id uuid primary key, email text);
grant all on table auth.users to postgres;
