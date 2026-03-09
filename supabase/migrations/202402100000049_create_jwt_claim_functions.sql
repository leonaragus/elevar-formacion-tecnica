
create or replace function get_my_claims() returns jsonb as $$
  select coalesce(
    current_setting('request.jwt.claims', true),
    '{}'
  )::jsonb;
$$ language sql stable;

create or replace function get_my_claim(claim text) returns jsonb as $$
  select get_my_claims()->claim;
$$ language sql stable;
