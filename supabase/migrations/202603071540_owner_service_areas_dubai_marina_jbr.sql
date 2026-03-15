do $$
begin
  if to_regclass('public.owner_settings') is null then
    raise notice 'owner_settings table does not exist; skipping service area update';
    return;
  end if;

  update public.owner_settings
  set service_areas = 'Dubai Marina, JBR'
  where service_areas is null
     or btrim(service_areas) = ''
     or service_areas <> 'Dubai Marina, JBR';
end $$;
