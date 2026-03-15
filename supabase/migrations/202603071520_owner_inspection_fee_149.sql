do $$
begin
  if to_regclass('public.owner_settings') is null then
    raise notice 'owner_settings table does not exist; skipping inspection fee update';
    return;
  end if;

  update public.owner_settings
  set inspection_fee = 149
  where inspection_fee is null or inspection_fee <> 149;
end $$;
