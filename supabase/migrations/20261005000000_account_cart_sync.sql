-- Give every signed-in customer one cart shared by web and mobile.
alter table public.cart_snapshots
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create unique index if not exists cart_snapshots_user_id_key
  on public.cart_snapshots (user_id);

drop policy if exists "Customers can read their own cart" on public.cart_snapshots;
create policy "Customers can read their own cart"
  on public.cart_snapshots for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.cart_snapshots to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cart_snapshots'
  ) then
    alter publication supabase_realtime add table public.cart_snapshots;
  end if;
end $$;
