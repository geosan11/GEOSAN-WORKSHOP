-- Register the owner by email. Replace <YOUR_ACCOUNT_EMAIL> with the email
-- you sign in with. If no account has that email, this raises an error, and
-- inside the rollout transaction (docs/SECURITY-DB.md) that undoes the
-- whole migration, so you can never end up locked out.
do $$
declare
  owner_email constant text := '<YOUR_ACCOUNT_EMAIL>';
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(owner_email);
  if uid is null then
    raise exception 'No Supabase account with email %; nothing was changed', owner_email;
  end if;
  insert into public.app_owner (user_id) values (uid) on conflict (user_id) do nothing;
  raise notice 'Owner registered: % (%)', owner_email, uid;
end
$$;
