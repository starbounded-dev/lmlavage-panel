create table public.prospecting_houses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  canvassing_visit_id uuid references public.canvassing_visits(id) on delete set null,
  address text not null,
  city text not null default 'Gatineau',
  province text not null default 'QC',
  postal_code text,
  status text not null default 'no_answer' check (status in ('no_answer', 'revisit', 'interested', 'client_obtained', 'do_not_revisit')),
  visited_at date,
  revisit_date date,
  notes text,
  latitude double precision,
  longitude double precision,
  created_client_id uuid references public.clients(id) on delete set null,
  created_property_id uuid references public.properties(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospecting_houses_coordinates_together check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  )
);

create index prospecting_houses_business_status_idx
  on public.prospecting_houses(business_id, status);

create index prospecting_houses_business_visit_idx
  on public.prospecting_houses(business_id, visited_at desc)
  where visited_at is not null;

create index prospecting_houses_business_revisit_idx
  on public.prospecting_houses(business_id, revisit_date)
  where revisit_date is not null;

create index prospecting_houses_canvassing_visit_id_idx
  on public.prospecting_houses(canvassing_visit_id)
  where canvassing_visit_id is not null;

create index prospecting_houses_created_client_id_idx
  on public.prospecting_houses(created_client_id)
  where created_client_id is not null;

alter table public.prospecting_houses enable row level security;

create policy prospecting_houses_tenant_access
  on public.prospecting_houses
  for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

comment on table public.prospecting_houses is 'Maisons individuelles suivies dans le mode terrain de prospection.';
comment on column public.prospecting_houses.status is 'no_answer, revisit, interested, client_obtained ou do_not_revisit.';
comment on column public.prospecting_houses.latitude is 'Latitude GPS ou choisie sur la carte.';
comment on column public.prospecting_houses.longitude is 'Longitude GPS ou choisie sur la carte.';
