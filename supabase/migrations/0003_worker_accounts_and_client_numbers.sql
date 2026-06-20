alter table public.workers
  add column user_id uuid references auth.users(id) on delete set null;

create unique index workers_business_user_id_unique
  on public.workers(business_id, user_id)
  where user_id is not null;

create index workers_user_id_idx
  on public.workers(user_id)
  where user_id is not null;

alter table public.clients
  add column client_number integer;

with numbered as (
  select
    id,
    row_number() over (partition by business_id order by created_at, id)::integer as client_number
  from public.clients
)
update public.clients
set client_number = numbered.client_number
from numbered
where public.clients.id = numbered.id;

alter table public.clients
  alter column client_number set not null,
  alter column name drop not null,
  add constraint clients_client_number_positive check (client_number > 0);

create unique index clients_business_client_number_unique
  on public.clients(business_id, client_number);

create or replace function public.assign_client_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.client_number is null then
    perform pg_advisory_xact_lock(hashtextextended(new.business_id::text, 0));
    select coalesce(max(client_number), 0) + 1
      into new.client_number
      from public.clients
      where business_id = new.business_id;
  end if;
  return new;
end;
$$;

create trigger clients_assign_number
before insert on public.clients
for each row execute function public.assign_client_number();

alter table public.properties
  alter column address drop not null,
  alter column city drop not null,
  alter column province drop not null;

create or replace function public.refresh_paid_allocation_amounts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  adjustment numeric(12,2);
  final_allocation_id uuid;
begin
  if new.payment_status = 'paid' and new.service_subtotal <> old.service_subtotal then
    update public.payment_allocations
    set
      service_revenue_snapshot = new.service_subtotal,
      amount = round(new.service_subtotal * percentage_snapshot / 100, 2)
    where job_id = new.id;

    select id
      into final_allocation_id
      from public.payment_allocations
      where job_id = new.id
      order by created_at desc, id desc
      limit 1;

    if final_allocation_id is not null then
      select new.service_subtotal - coalesce(sum(amount), 0)
        into adjustment
        from public.payment_allocations
        where job_id = new.id;

      update public.payment_allocations
      set amount = amount + adjustment
      where id = final_allocation_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger jobs_refresh_paid_allocations
after update of service_subtotal on public.jobs
for each row execute function public.refresh_paid_allocation_amounts();
