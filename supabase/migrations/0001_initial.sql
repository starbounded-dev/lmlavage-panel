create extension if not exists pgcrypto;

create type public.job_status as enum ('scheduled', 'completed', 'cancelled');
create type public.payment_status as enum ('unpaid', 'paid');
create type public.service_scope as enum ('inside', 'outside', 'both');
create type public.sync_status as enum ('not_connected', 'pending', 'synced', 'error');
create type public.bucket_type as enum ('person', 'reserve');
create type public.sales_split_profile as enum ('standard', 'po_sale');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'CAD' check (currency = 'CAD'),
  timezone text not null default 'America/Toronto' check (timezone = 'America/Toronto'),
  gst_enabled boolean not null default false,
  qst_enabled boolean not null default false,
  gst_rate numeric(8,6) not null default 0.05,
  qst_rate numeric(8,6) not null default 0.09975,
  default_followup_months smallint not null default 12 check (default_followup_months between 1 and 60),
  digest_email text,
  created_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_id_idx on public.business_members(user_id);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);
create index clients_business_id_idx on public.clients(business_id);
create index clients_business_name_idx on public.clients(business_id, name);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  address text not null,
  city text not null default 'Gatineau',
  province text not null default 'QC',
  postal_code text,
  created_at timestamptz not null default now()
);
create index properties_business_id_idx on public.properties(business_id);
create index properties_client_id_idx on public.properties(client_id);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  sales_split_profile public.sales_split_profile not null default 'standard',
  created_at timestamptz not null default now(),
  unique (business_id, name)
);
create index workers_business_id_idx on public.workers(business_id);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  seller_worker_id uuid references public.workers(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  service_scope public.service_scope not null,
  window_count integer check (window_count is null or window_count >= 0),
  service_subtotal numeric(12,2) not null default 0 check (service_subtotal >= 0),
  gst_amount numeric(12,2) not null default 0 check (gst_amount >= 0),
  qst_amount numeric(12,2) not null default 0 check (qst_amount >= 0),
  total_due numeric(12,2) not null default 0 check (total_due >= 0),
  tip_amount numeric(12,2) not null default 0 check (tip_amount >= 0),
  status public.job_status not null default 'scheduled',
  payment_status public.payment_status not null default 'unpaid',
  paid_at timestamptz,
  payment_method text,
  followup_date date,
  notes text,
  google_event_id text,
  google_sync_status public.sync_status not null default 'not_connected',
  google_sync_error text,
  created_at timestamptz not null default now()
);
create index jobs_business_id_idx on public.jobs(business_id);
create index jobs_business_starts_idx on public.jobs(business_id, starts_at);
create index jobs_business_followup_idx on public.jobs(business_id, followup_date) where followup_date is not null;
create index jobs_business_unpaid_idx on public.jobs(business_id, payment_status) where payment_status = 'unpaid';
create index jobs_client_id_idx on public.jobs(client_id);
create index jobs_property_id_idx on public.jobs(property_id);
create index jobs_seller_worker_id_idx on public.jobs(seller_worker_id);

create table public.job_workers (
  business_id uuid not null references public.businesses(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete restrict,
  primary key (job_id, worker_id)
);
create index job_workers_business_id_idx on public.job_workers(business_id);
create index job_workers_worker_id_idx on public.job_workers(worker_id);

create table public.tip_allocations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);
create index tip_allocations_business_id_idx on public.tip_allocations(business_id);
create index tip_allocations_job_id_idx on public.tip_allocations(job_id);

create table public.allocation_buckets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  bucket_type public.bucket_type not null default 'person',
  percentage numeric(7,4) not null check (percentage >= 0 and percentage <= 100),
  po_sale_percentage numeric(7,4) not null check (po_sale_percentage >= 0 and po_sale_percentage <= 100),
  active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);
create index allocation_buckets_business_id_idx on public.allocation_buckets(business_id);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  bucket_id uuid references public.allocation_buckets(id) on delete set null,
  bucket_name text not null,
  percentage_snapshot numeric(7,4) not null,
  service_revenue_snapshot numeric(12,2) not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (job_id, bucket_name)
);
create index payment_allocations_business_id_idx on public.payment_allocations(business_id);
create index payment_allocations_job_id_idx on public.payment_allocations(job_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  expense_date date not null,
  vendor text not null,
  category text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  gst_amount numeric(12,2) not null default 0 check (gst_amount >= 0),
  qst_amount numeric(12,2) not null default 0 check (qst_amount >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_method text,
  notes text,
  job_id uuid references public.jobs(id) on delete set null,
  receipt_path text,
  created_at timestamptz not null default now()
);
create index expenses_business_date_idx on public.expenses(business_id, expense_date desc);
create index expenses_job_id_idx on public.expenses(job_id) where job_id is not null;

create table public.canvassing_visits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  street text not null,
  city text not null default 'Gatineau',
  visited_at date not null,
  outcome text not null,
  notes text,
  revisit_date date,
  created_at timestamptz not null default now()
);
create index canvassing_business_visit_idx on public.canvassing_visits(business_id, visited_at desc);
create index canvassing_business_revisit_idx on public.canvassing_visits(business_id, revisit_date) where revisit_date is not null;

create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  provider text not null default 'google' check (provider = 'google'),
  calendar_id text not null default 'primary',
  encrypted_refresh_token text not null,
  token_iv text not null,
  token_tag text not null,
  connected_email text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  fingerprint text not null,
  status text not null check (status in ('completed', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (business_id, fingerprint)
);
create index import_runs_business_id_idx on public.import_runs(business_id);

create table public.import_source_rows (
  business_id uuid not null references public.businesses(id) on delete cascade,
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  entity_type text not null,
  source_row integer not null,
  entity_id uuid not null,
  primary key (import_run_id, entity_type, source_row)
);
create index import_source_rows_business_id_idx on public.import_source_rows(business_id);

create table public.digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  local_date date not null,
  status text not null check (status in ('sending', 'sent', 'failed')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  unique (business_id, local_date)
);
create index digest_deliveries_business_id_idx on public.digest_deliveries(business_id);

create or replace function public.is_business_member(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.business_members where business_id = target_business_id and user_id = (select auth.uid())) $$;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;

create policy businesses_member_select on public.businesses for select using (public.is_business_member(id));
create policy businesses_member_update on public.businesses for update using (public.is_business_member(id)) with check (public.is_business_member(id));
create policy members_self_select on public.business_members for select using (user_id = (select auth.uid()));

do $$
declare table_name text;
begin
  foreach table_name in array array['clients','properties','workers','jobs','job_workers','tip_allocations','allocation_buckets','payment_allocations','expenses','canvassing_visits','calendar_connections','import_runs','import_source_rows','digest_deliveries']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id))', table_name || '_tenant_access', table_name);
  end loop;
end $$;

create or replace function public.validate_allocation_total(target_business_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare standard_total numeric; po_sale_total numeric;
begin
  select coalesce(sum(percentage), 0), coalesce(sum(po_sale_percentage), 0)
  into standard_total, po_sale_total
  from public.allocation_buckets where business_id = target_business_id and active;
  if standard_total <> 100 then raise exception 'La répartition standard doit totaliser 100 (actuel: %).', standard_total; end if;
  if po_sale_total <> 100 then raise exception 'La répartition des ventes P-O doit totaliser 100 (actuel: %).', po_sale_total; end if;
end $$;

create or replace function public.enforce_allocation_total()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.validate_allocation_total(coalesce(new.business_id, old.business_id));
  return coalesce(new, old);
end $$;
create constraint trigger allocation_buckets_total after insert or update or delete on public.allocation_buckets deferrable initially deferred for each row execute function public.enforce_allocation_total();

create or replace function public.snapshot_payment_allocations()
returns trigger language plpgsql security definer set search_path = public as $$
declare bucket record; running_total numeric(12,2) := 0; bucket_count integer; position integer := 0; allocation_amount numeric(12,2); allocation_percentage numeric(7,4); seller_profile public.sales_split_profile := 'standard';
begin
  if new.payment_status = 'paid' and (tg_op = 'INSERT' or old.payment_status <> 'paid') then
    perform public.validate_allocation_total(new.business_id);
    if new.seller_worker_id is not null then
      select sales_split_profile into seller_profile from public.workers where id = new.seller_worker_id and business_id = new.business_id;
    end if;
    select count(*) into bucket_count from public.allocation_buckets where business_id = new.business_id and active;
    for bucket in select * from public.allocation_buckets where business_id = new.business_id and active order by sort_order, created_at loop
      position := position + 1;
      allocation_percentage := case when seller_profile = 'po_sale' then bucket.po_sale_percentage else bucket.percentage end;
      allocation_amount := case when position = bucket_count then new.service_subtotal - running_total else round(new.service_subtotal * allocation_percentage / 100, 2) end;
      insert into public.payment_allocations (business_id, job_id, bucket_id, bucket_name, percentage_snapshot, service_revenue_snapshot, amount)
      values (new.business_id, new.id, bucket.id, bucket.name, allocation_percentage, new.service_subtotal, allocation_amount);
      running_total := running_total + allocation_amount;
    end loop;
  end if;
  return new;
end $$;
create trigger jobs_snapshot_payment after insert or update of payment_status on public.jobs for each row execute function public.snapshot_payment_allocations();

create or replace function public.validate_tip_allocations()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_job uuid; allocated numeric; expected numeric;
begin
  target_job := coalesce(new.job_id, old.job_id);
  select coalesce(sum(amount), 0) into allocated from public.tip_allocations where job_id = target_job;
  select tip_amount into expected from public.jobs where id = target_job;
  if allocated <> expected then raise exception 'Les pourboires attribués (%) doivent égaler le pourboire du travail (%).', allocated, expected; end if;
  return coalesce(new, old);
end $$;
create constraint trigger tip_allocations_reconcile after insert or update or delete on public.tip_allocations deferrable initially deferred for each row execute function public.validate_tip_allocations();

create or replace function public.validate_job_tip_total()
returns trigger language plpgsql security definer set search_path = public as $$
declare allocated numeric;
begin
  select coalesce(sum(amount), 0) into allocated from public.tip_allocations where job_id = new.id;
  if allocated <> new.tip_amount then raise exception 'Les pourboires attribués (%) doivent égaler le pourboire du travail (%).', allocated, new.tip_amount; end if;
  return new;
end $$;
create constraint trigger jobs_tip_reconcile after insert or update of tip_amount on public.jobs deferrable initially deferred for each row execute function public.validate_job_tip_total();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;
create policy receipts_member_read on storage.objects for select using (bucket_id = 'receipts' and public.is_business_member((storage.foldername(name))[1]::uuid));
create policy receipts_member_insert on storage.objects for insert with check (bucket_id = 'receipts' and public.is_business_member((storage.foldername(name))[1]::uuid));
create policy receipts_member_delete on storage.objects for delete using (bucket_id = 'receipts' and public.is_business_member((storage.foldername(name))[1]::uuid));

create or replace function public.import_lm_workbook(p_business_id uuid, p_fingerprint text, p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare run_id uuid; item jsonb; client_id uuid; property_id uuid; job_id uuid; expense_id uuid; visit_id uuid; source_date date; start_time timestamptz;
begin
  if not public.is_business_member(p_business_id) then raise exception 'Non autorisé'; end if;
  insert into public.import_runs (business_id, fingerprint, status, summary)
  values (p_business_id, p_fingerprint, 'completed', jsonb_build_object('jobs', jsonb_array_length(p_payload->'jobs'), 'expenses', jsonb_array_length(p_payload->'expenses'), 'streets', jsonb_array_length(p_payload->'streets')))
  on conflict (business_id, fingerprint) do nothing returning id into run_id;
  if run_id is null then return jsonb_build_object('alreadyImported', true); end if;

  perform public.validate_allocation_total(p_business_id);

  for item in select * from jsonb_array_elements(p_payload->'jobs') loop
    insert into public.clients (business_id, name, needs_review) values (p_business_id, item->>'clientName', (item->>'needsReview')::boolean) returning id into client_id;
    insert into public.properties (business_id, client_id, address, city, province) values (p_business_id, client_id, item->>'address', 'Gatineau', 'QC') returning id into property_id;
    source_date := (item->>'completedOn')::date;
    start_time := (source_date::timestamp + time '09:00') at time zone 'America/Toronto';
    insert into public.jobs (business_id, client_id, property_id, starts_at, ends_at, service_scope, service_subtotal, total_due, tip_amount, status, payment_status, paid_at, followup_date, notes)
    values (p_business_id, client_id, property_id, start_time, start_time + interval '2 hours', (item->>'serviceScope')::public.service_scope, (item->>'serviceRevenue')::numeric, (item->>'serviceRevenue')::numeric, (item->>'tip')::numeric, 'completed', 'paid', start_time + interval '2 hours', nullif(item->>'followupDate','')::date, 'Importé du classeur LM') returning id into job_id;
    if (item->>'tip')::numeric > 0 then insert into public.tip_allocations (business_id, job_id, worker_id, amount, needs_review) values (p_business_id, job_id, null, (item->>'tip')::numeric, true); end if;
    insert into public.import_source_rows values (p_business_id, run_id, 'job', (item->>'sourceRow')::integer, job_id);
  end loop;

  for item in select * from jsonb_array_elements(p_payload->'expenses') loop
    insert into public.expenses (business_id, expense_date, vendor, category, subtotal, total, notes)
    values (p_business_id, (item->>'date')::date, item->>'vendor', 'Équipement', (item->>'total')::numeric, (item->>'total')::numeric, 'Importé du classeur LM') returning id into expense_id;
    insert into public.import_source_rows values (p_business_id, run_id, 'expense', (item->>'sourceRow')::integer, expense_id);
  end loop;

  for item in select * from jsonb_array_elements(p_payload->'streets') loop
    insert into public.canvassing_visits (business_id, street, city, visited_at, outcome, notes)
    values (p_business_id, item->>'street', coalesce(item->>'city','Gatineau'), date '2026-05-30', 'Visité', 'Importé du classeur LM') returning id into visit_id;
    insert into public.import_source_rows values (p_business_id, run_id, 'canvassing', (item->>'sourceRow')::integer, visit_id);
  end loop;
  return jsonb_build_object('alreadyImported', false, 'jobs', jsonb_array_length(p_payload->'jobs'), 'expenses', jsonb_array_length(p_payload->'expenses'), 'streets', jsonb_array_length(p_payload->'streets'));
end $$;

-- Run once after creating the owner through the Supabase dashboard:
-- select public.provision_lm_owner('OWNER_USER_UUID', 'owner@example.com');
create or replace function public.provision_lm_owner(p_user_id uuid, p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare business_id uuid;
begin
  if not exists (select 1 from auth.users where id = p_user_id and email = p_email) then raise exception 'Utilisateur introuvable'; end if;
  insert into public.businesses (name, digest_email) values ('LM Lavage de Vitres', p_email) returning id into business_id;
  insert into public.business_members values (business_id, p_user_id, 'owner', now());
  insert into public.workers (business_id, name, sales_split_profile) values (business_id, 'Alexis', 'standard'), (business_id, 'Guillaume', 'standard'), (business_id, 'P-O', 'po_sale');
  insert into public.allocation_buckets (business_id, name, bucket_type, percentage, po_sale_percentage, sort_order) values
    (business_id, 'Alexis', 'person', 40, 35, 1),
    (business_id, 'Guillaume', 'person', 40, 35, 2),
    (business_id, 'Gaz', 'reserve', 20, 15, 3),
    (business_id, 'P-O', 'person', 0, 15, 4);
  return business_id;
end $$;
