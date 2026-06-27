alter table public.workers
  add column if not exists sales_split_key text;

update public.workers
set sales_split_key = case
  when lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) in ('alexis', 'alex') then 'alexis_sale'
  when lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) in ('guillaume', 'guigui') then 'guillaume_sale'
  when lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) in ('po', 'poo') then 'po_sale'
  when sales_split_profile = 'po_sale' then 'po_sale'
  else 'legacy_standard'
end
where sales_split_key is null;

alter table public.workers
  alter column sales_split_key set default 'legacy_standard',
  alter column sales_split_key set not null;

alter table public.workers
  drop constraint if exists workers_sales_split_key_check,
  add constraint workers_sales_split_key_check
  check (sales_split_key in ('legacy_standard', 'alexis_sale', 'guillaume_sale', 'po_sale', 'split_alexis_guillaume'));

alter table public.jobs
  add column if not exists sales_split_key text;

update public.jobs j
set sales_split_key = case
  when w.sales_split_key in ('alexis_sale', 'guillaume_sale', 'po_sale') then w.sales_split_key
  when j.seller_worker_id is null and j.payment_status = 'paid' then 'legacy_standard'
  else 'split_alexis_guillaume'
end
from public.workers w
where j.seller_worker_id = w.id
  and j.sales_split_key is null;

update public.jobs
set sales_split_key = case
  when seller_worker_id is null and payment_status = 'paid' then 'legacy_standard'
  else 'split_alexis_guillaume'
end
where sales_split_key is null;

alter table public.jobs
  alter column sales_split_key set default 'split_alexis_guillaume',
  alter column sales_split_key set not null;

alter table public.jobs
  drop constraint if exists jobs_sales_split_key_check,
  add constraint jobs_sales_split_key_check
  check (sales_split_key in ('legacy_standard', 'alexis_sale', 'guillaume_sale', 'po_sale', 'split_alexis_guillaume'));

create index if not exists jobs_business_sales_split_idx on public.jobs(business_id, sales_split_key);

alter table public.expenses
  add column if not exists purchaser_worker_id uuid references public.workers(id) on delete set null;

create index if not exists expenses_purchaser_worker_id_idx
  on public.expenses(purchaser_worker_id)
  where purchaser_worker_id is not null;

alter table public.allocation_buckets
  add column if not exists alexis_sale_percentage numeric(7,4) not null default 0 check (alexis_sale_percentage >= 0 and alexis_sale_percentage <= 100),
  add column if not exists guillaume_sale_percentage numeric(7,4) not null default 0 check (guillaume_sale_percentage >= 0 and guillaume_sale_percentage <= 100),
  add column if not exists split_sale_percentage numeric(7,4) not null default 0 check (split_sale_percentage >= 0 and split_sale_percentage <= 100);

insert into public.allocation_buckets (
  business_id,
  name,
  bucket_type,
  percentage,
  po_sale_percentage,
  alexis_sale_percentage,
  guillaume_sale_percentage,
  split_sale_percentage,
  sort_order
)
select
  id,
  'Produits',
  'reserve'::public.bucket_type,
  0,
  0,
  0,
  0,
  5,
  5
from public.businesses
on conflict (business_id, name) do update
set
  bucket_type = 'reserve'::public.bucket_type,
  split_sale_percentage = 5,
  active = true;

update public.allocation_buckets
set
  percentage = case name
    when 'Alexis' then 40
    when 'Guillaume' then 40
    when 'Gaz' then 20
    when 'P-O' then 0
    when 'Produits' then 0
    else percentage
  end,
  alexis_sale_percentage = case name
    when 'Alexis' then 50
    when 'Guillaume' then 35
    when 'Gaz' then 15
    when 'P-O' then 0
    when 'Produits' then 0
    else alexis_sale_percentage
  end,
  guillaume_sale_percentage = case name
    when 'Alexis' then 35
    when 'Guillaume' then 50
    when 'Gaz' then 15
    when 'P-O' then 0
    when 'Produits' then 0
    else guillaume_sale_percentage
  end,
  po_sale_percentage = case name
    when 'Alexis' then 35
    when 'Guillaume' then 35
    when 'Gaz' then 15
    when 'P-O' then 15
    when 'Produits' then 0
    else po_sale_percentage
  end,
  split_sale_percentage = case name
    when 'Alexis' then 40
    when 'Guillaume' then 40
    when 'Gaz' then 15
    when 'P-O' then 0
    when 'Produits' then 5
    else split_sale_percentage
  end,
  bucket_type = case
    when name in ('Gaz', 'Produits') then 'reserve'::public.bucket_type
    when name in ('Alexis', 'Guillaume', 'P-O') then 'person'::public.bucket_type
    else bucket_type
  end,
  sort_order = case name
    when 'Alexis' then 1
    when 'Guillaume' then 2
    when 'Gaz' then 3
    when 'P-O' then 4
    when 'Produits' then 5
    else sort_order
  end;

create or replace function public.validate_allocation_total(target_business_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  legacy_total numeric;
  alexis_total numeric;
  guillaume_total numeric;
  po_total numeric;
  split_total numeric;
begin
  select
    coalesce(sum(percentage), 0),
    coalesce(sum(alexis_sale_percentage), 0),
    coalesce(sum(guillaume_sale_percentage), 0),
    coalesce(sum(po_sale_percentage), 0),
    coalesce(sum(split_sale_percentage), 0)
  into legacy_total, alexis_total, guillaume_total, po_total, split_total
  from public.allocation_buckets
  where business_id = target_business_id and active;

  if legacy_total <> 100 then raise exception 'La répartition historique doit totaliser 100 (actuel: %).', legacy_total; end if;
  if alexis_total <> 100 then raise exception 'La répartition des ventes Alexis doit totaliser 100 (actuel: %).', alexis_total; end if;
  if guillaume_total <> 100 then raise exception 'La répartition des ventes Guillaume doit totaliser 100 (actuel: %).', guillaume_total; end if;
  if po_total <> 100 then raise exception 'La répartition des ventes P-O doit totaliser 100 (actuel: %).', po_total; end if;
  if split_total <> 100 then raise exception 'La répartition des ventes split Alexis/Guillaume doit totaliser 100 (actuel: %).', split_total; end if;
end $$;

create or replace function public.snapshot_payment_allocations()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  bucket record;
  running_total numeric(12,2) := 0;
  bucket_count integer;
  position integer := 0;
  allocation_amount numeric(12,2);
  allocation_percentage numeric(7,4);
  sale_profile text := 'legacy_standard';
begin
  if new.payment_status = 'paid' and (tg_op = 'INSERT' or old.payment_status <> 'paid') then
    perform public.validate_allocation_total(new.business_id);
    sale_profile := coalesce(new.sales_split_key, 'legacy_standard');
    select count(*) into bucket_count from public.allocation_buckets where business_id = new.business_id and active;

    for bucket in select * from public.allocation_buckets where business_id = new.business_id and active order by sort_order, created_at loop
      position := position + 1;
      allocation_percentage := case sale_profile
        when 'alexis_sale' then bucket.alexis_sale_percentage
        when 'guillaume_sale' then bucket.guillaume_sale_percentage
        when 'po_sale' then bucket.po_sale_percentage
        when 'split_alexis_guillaume' then bucket.split_sale_percentage
        else bucket.percentage
      end;
      allocation_amount := case when position = bucket_count then new.service_subtotal - running_total else round(new.service_subtotal * allocation_percentage / 100, 2) end;
      insert into public.payment_allocations (business_id, job_id, bucket_id, bucket_name, percentage_snapshot, service_revenue_snapshot, amount)
      values (new.business_id, new.id, bucket.id, bucket.name, allocation_percentage, new.service_subtotal, allocation_amount);
      running_total := running_total + allocation_amount;
    end loop;
  end if;
  return new;
end $$;

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
    insert into public.jobs (business_id, client_id, property_id, starts_at, ends_at, service_scope, service_subtotal, total_due, tip_amount, status, payment_status, paid_at, followup_date, notes, sales_split_key)
    values (p_business_id, client_id, property_id, start_time, start_time + interval '2 hours', (item->>'serviceScope')::public.service_scope, (item->>'serviceRevenue')::numeric, (item->>'serviceRevenue')::numeric, (item->>'tip')::numeric, 'completed', 'paid', start_time + interval '2 hours', nullif(item->>'followupDate','')::date, 'Importé du classeur LM', 'legacy_standard') returning id into job_id;
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

create or replace function public.provision_lm_owner(p_user_id uuid, p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare business_id uuid;
begin
  if not exists (select 1 from auth.users where id = p_user_id and email = p_email) then raise exception 'Utilisateur introuvable'; end if;
  insert into public.businesses (name, digest_email) values ('LM Lavage de Vitres', p_email) returning id into business_id;
  insert into public.business_members values (business_id, p_user_id, 'owner', now());
  insert into public.workers (business_id, name, sales_split_profile, sales_split_key) values
    (business_id, 'Alexis', 'standard', 'alexis_sale'),
    (business_id, 'Guillaume', 'standard', 'guillaume_sale'),
    (business_id, 'P-O', 'po_sale', 'po_sale');
  insert into public.allocation_buckets (business_id, name, bucket_type, percentage, po_sale_percentage, alexis_sale_percentage, guillaume_sale_percentage, split_sale_percentage, sort_order) values
    (business_id, 'Alexis', 'person', 40, 35, 50, 35, 40, 1),
    (business_id, 'Guillaume', 'person', 40, 35, 35, 50, 40, 2),
    (business_id, 'Gaz', 'reserve', 20, 15, 15, 15, 15, 3),
    (business_id, 'P-O', 'person', 0, 15, 0, 0, 0, 4),
    (business_id, 'Produits', 'reserve', 0, 0, 0, 0, 5, 5);
  return business_id;
end $$;

drop policy if exists members_self_select on public.business_members;
drop policy if exists members_tenant_select on public.business_members;
create policy members_tenant_select on public.business_members
  for select using (public.is_business_member(business_id));
