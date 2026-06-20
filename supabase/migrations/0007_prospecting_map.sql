alter table public.properties
  add column latitude double precision,
  add column longitude double precision,
  add constraint properties_coordinates_together check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  );

alter table public.canvassing_visits
  add column start_address text,
  add column end_address text,
  add column route_coordinates jsonb,
  add constraint canvassing_addresses_together check (
    (start_address is null and end_address is null)
    or (start_address is not null and end_address is not null)
  ),
  add constraint canvassing_route_is_array check (
    route_coordinates is null or jsonb_typeof(route_coordinates) = 'array'
  );

comment on column public.properties.latitude is 'Latitude choisie manuellement sur la carte de prospection.';
comment on column public.properties.longitude is 'Longitude choisie manuellement sur la carte de prospection.';
comment on column public.canvassing_visits.route_coordinates is 'Tracé manuel sous forme de paires [latitude, longitude].';
