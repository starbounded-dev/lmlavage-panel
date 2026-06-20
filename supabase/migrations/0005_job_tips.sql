create or replace function public.set_job_tip(
  p_business_id uuid,
  p_job_id uuid,
  p_tip_amount numeric,
  p_worker_ids uuid[] default array[]::uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  assigned_worker_ids uuid[];
  assigned_worker_id uuid;
  worker_count integer;
  worker_position integer := 0;
  allocated numeric(12,2) := 0;
  allocation_amount numeric(12,2);
  normalized_tip numeric(12,2) := round(p_tip_amount, 2);
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'Non autorisé';
  end if;
  if normalized_tip < 0 then
    raise exception 'Le pourboire ne peut pas être négatif.';
  end if;
  if not exists (
    select 1 from public.jobs where id = p_job_id and business_id = p_business_id
  ) then
    raise exception 'Travail introuvable.';
  end if;

  select coalesce(array_agg(w.id order by w.id), array[]::uuid[])
    into assigned_worker_ids
    from public.workers w
    join public.job_workers jw on jw.worker_id = w.id and jw.job_id = p_job_id
    where w.business_id = p_business_id
      and w.id = any(coalesce(p_worker_ids, array[]::uuid[]));

  delete from public.tip_allocations
  where business_id = p_business_id and job_id = p_job_id;

  update public.jobs
  set tip_amount = normalized_tip
  where business_id = p_business_id and id = p_job_id;

  if normalized_tip = 0 then
    return;
  end if;

  worker_count := coalesce(array_length(assigned_worker_ids, 1), 0);
  if worker_count = 0 then
    insert into public.tip_allocations (business_id, job_id, worker_id, amount, needs_review)
    values (p_business_id, p_job_id, null, normalized_tip, true);
    return;
  end if;

  foreach assigned_worker_id in array assigned_worker_ids loop
    worker_position := worker_position + 1;
    allocation_amount := case
      when worker_position = worker_count then normalized_tip - allocated
      else round(normalized_tip / worker_count, 2)
    end;
    allocated := allocated + allocation_amount;

    insert into public.tip_allocations (business_id, job_id, worker_id, amount, needs_review)
    values (p_business_id, p_job_id, assigned_worker_id, allocation_amount, false);
  end loop;
end;
$$;
