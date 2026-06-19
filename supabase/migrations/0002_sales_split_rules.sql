do $$
begin
  create type public.sales_split_profile as enum ('standard', 'po_sale');
exception
  when duplicate_object then null;
end $$;

alter table public.workers
  add column if not exists sales_split_profile public.sales_split_profile not null default 'standard';

update public.workers
set sales_split_profile = case when lower(replace(name, '-', '')) = 'po' then 'po_sale'::public.sales_split_profile else 'standard'::public.sales_split_profile end;

alter table public.jobs
  add column if not exists seller_worker_id uuid references public.workers(id) on delete restrict;
create index if not exists jobs_seller_worker_id_idx on public.jobs(seller_worker_id);

alter table public.allocation_buckets
  add column if not exists po_sale_percentage numeric(7,4) not null default 0 check (po_sale_percentage >= 0 and po_sale_percentage <= 100);

update public.allocation_buckets
set percentage = case name
      when 'Alexis' then 40
      when 'Guillaume' then 40
      when 'Gaz' then 20
      when 'P-O' then 0
      else percentage
    end,
    po_sale_percentage = case name
      when 'Alexis' then 35
      when 'Guillaume' then 35
      when 'Gaz' then 15
      when 'P-O' then 15
      else po_sale_percentage
    end,
    bucket_type = case when name = 'Gaz' then 'reserve'::public.bucket_type else bucket_type end;

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

create temporary table lm_imported_paid_jobs on commit drop as
select j.id
from public.jobs j
join public.import_source_rows source on source.entity_type = 'job' and source.entity_id = j.id
where j.payment_status = 'paid';

update public.jobs set payment_status = 'unpaid' where id in (select id from lm_imported_paid_jobs);
delete from public.payment_allocations where job_id in (select id from lm_imported_paid_jobs);
update public.jobs set payment_status = 'paid' where id in (select id from lm_imported_paid_jobs);
