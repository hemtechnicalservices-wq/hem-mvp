alter table amc_contracts add column if not exists property_id uuid references properties(id) on delete set null;
alter table amc_contracts add column if not exists plan_id uuid references amc_plans(id) on delete set null;
alter table amc_contracts add column if not exists visits_used int not null default 0;
alter table amc_contracts add column if not exists emergency_calls_used int not null default 0;
alter table amc_contracts add column if not exists contract_pdf_url text;

create index if not exists idx_amc_contracts_plan_id on amc_contracts(plan_id);
