alter table if exists quotes add column if not exists inspection_fee numeric(10,2) not null default 0;
alter table if exists quotes add column if not exists discount numeric(10,2) not null default 0;
alter table if exists quotes add column if not exists quote_notes text;

