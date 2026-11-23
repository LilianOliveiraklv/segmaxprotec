-- SEGMAX PROTEC — agenda inteligente por técnico.
-- Expediente: segunda a sábado, 08:00–20:00; almoço bloqueado das 12:00 às 13:00.
-- Instalação/manutenção: 4 horas de trabalho. Visita técnica: 1 hora.
-- Serviços que atravessam o almoço têm o término prorrogado em 1 hora.
-- Execute no SQL Editor do Supabase.

create extension if not exists btree_gist;

create table if not exists public.technicians (
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 active boolean not null default true
);
create table if not exists public.appointments (
 id uuid primary key default gen_random_uuid(),
 client_name text not null,
 phone text not null,
 city text not null,
 service text not null,
 notes text,
 starts_at timestamptz not null,
 duration_minutes integer not null default 240,
 status text not null default 'Agendado'
   check(status in ('Agendado','Em andamento','Concluído','Cancelado','Reagendar')),
 technician_id uuid references public.technicians(user_id),
 created_at timestamptz not null default now()
);
alter table public.appointments add column if not exists city text;
alter table public.appointments add column if not exists technician_id uuid references public.technicians(user_id);
alter table public.appointments add column if not exists duration_minutes integer not null default 240;
alter table public.appointments add column if not exists status text not null default 'Agendado';
-- Compatibilidade com versões anteriores que tinham a coluna address.
do $$
begin
 if exists (
   select 1 from information_schema.columns
   where table_schema='public' and table_name='appointments' and column_name='address'
 ) then
   alter table public.appointments alter column address drop not null;
 end if;
end $$;

alter table public.technicians enable row level security;
alter table public.appointments enable row level security;
drop policy if exists "public can create appointment" on public.appointments;
drop policy if exists "technicians read appointments" on public.appointments;
drop policy if exists "technicians update appointments" on public.appointments;
drop policy if exists "technicians read own profile" on public.technicians;
create policy "technicians read appointments" on public.appointments for select to authenticated
using(exists(select 1 from public.technicians t where t.user_id=auth.uid() and t.active));
create policy "technicians update appointments" on public.appointments for update to authenticated
using(exists(select 1 from public.technicians t where t.user_id=auth.uid() and t.active))
with check(exists(select 1 from public.technicians t where t.user_id=auth.uid() and t.active));
create policy "technicians read own profile" on public.technicians for select to authenticated
using(user_id=auth.uid());

drop function if exists public.available_dates();
drop function if exists public.available_dates(text);
drop function if exists public.available_slots(date);
drop function if exists public.available_slots(date,text);
drop function if exists public.book_appointment(text,text,text,text,text,date,text);

create or replace function public.service_duration(p_service text)
returns integer language sql immutable as $$
 select case
  when lower(p_service) like '%visita técnica%' then 60
  when lower(p_service) like '%instalação%' or lower(p_service) like '%manutenção%' then 240
  else 240
 end;
$$;

create or replace function public.booking_elapsed_minutes(p_service text,p_slot time)
returns integer language sql immutable as $$
 select public.service_duration(p_service) +
  case when p_slot < time '12:00'
    and p_slot + make_interval(mins=>public.service_duration(p_service)) > time '12:00'
   then 60 else 0 end;
$$;

create or replace function public.available_dates(p_service text)
returns table(available_date date)
language sql security definer set search_path=public as $$
 with cfg as (select public.service_duration(p_service) as mins),
 days as (
  select (current_date+n)::date as d from generate_series(0,45) n
  where extract(isodow from current_date+n) between 1 and 6
 ),
 slots as (
  select d.d,d.d+make_time(8+n,0,0) as local_start,cfg.mins
  from days d cross join generate_series(0,11) n cross join cfg
  where make_time(8+n,0,0) not between time '12:00' and time '12:59:59'
   and make_time(8+n,0,0)+make_interval(mins=>public.booking_elapsed_minutes(p_service,make_time(8+n,0,0)))<=time '20:00'
 )
 select distinct s.d from slots s
 where (s.local_start at time zone 'America/Sao_Paulo')>now()
 and exists(select 1 from public.technicians t where t.active
  and not exists(select 1 from public.appointments a
   where a.technician_id=t.user_id and a.status not in ('Cancelado','Reagendar')
   and tstzrange(a.starts_at,a.starts_at+make_interval(mins=>a.duration_minutes),'[)')
    && tstzrange(s.local_start at time zone 'America/Sao_Paulo',
      (s.local_start+make_interval(mins=>public.booking_elapsed_minutes(p_service,s.local_start::time))) at time zone 'America/Sao_Paulo','[)')))
 order by s.d;
$$;

create or replace function public.available_slots(p_date date,p_service text)
returns table(slot text)
language sql security definer set search_path=public as $$
 with cfg as (select public.service_duration(p_service) as mins),
 slots as (
  select p_date+make_time(8+n,0,0) as local_start,cfg.mins
  from generate_series(0,11) n cross join cfg
  where extract(isodow from p_date) between 1 and 6
   and make_time(8+n,0,0) not between time '12:00' and time '12:59:59'
   and make_time(8+n,0,0)+make_interval(mins=>public.booking_elapsed_minutes(p_service,make_time(8+n,0,0)))<=time '20:00'
 )
 select to_char(s.local_start,'HH24:MI') from slots s
 where (s.local_start at time zone 'America/Sao_Paulo')>now()
 and exists(select 1 from public.technicians t where t.active
  and not exists(select 1 from public.appointments a
   where a.technician_id=t.user_id and a.status not in ('Cancelado','Reagendar')
   and tstzrange(a.starts_at,a.starts_at+make_interval(mins=>a.duration_minutes),'[)')
    && tstzrange(s.local_start at time zone 'America/Sao_Paulo',
      (s.local_start+make_interval(mins=>public.booking_elapsed_minutes(p_service,s.local_start::time))) at time zone 'America/Sao_Paulo','[)')))
 order by s.local_start;
$$;

create or replace function public.book_appointment(
 p_client_name text,p_phone text,p_city text,p_service text,p_notes text,p_date date,p_slot text
)
returns uuid language plpgsql security definer set search_path=public as $$
declare chosen uuid; start_time timestamptz; mins integer; new_id uuid;
begin
 if length(trim(p_client_name)) not between 2 and 120
  or length(trim(p_phone)) not between 8 and 30
  or length(trim(p_city)) not between 2 and 100
  or length(trim(p_service)) not between 2 and 120 then raise exception 'Dados inválidos.'; end if;
 if p_date<(now() at time zone 'America/Sao_Paulo')::date
  or extract(isodow from p_date) not between 1 and 6 then raise exception 'SLOT_UNAVAILABLE'; end if;
 mins:=public.booking_elapsed_minutes(p_service,p_slot::time);
 start_time:=(p_date+p_slot::time) at time zone 'America/Sao_Paulo';
 if start_time<=now() or p_slot::time between time '12:00' and time '12:59:59'
  or (p_date+p_slot::time+make_interval(mins=>mins))>p_date+time '20:00'
 then raise exception 'SLOT_UNAVAILABLE'; end if;
 perform pg_advisory_xact_lock(hashtext(p_date::text||p_slot));
 select t.user_id into chosen from public.technicians t
 where t.active and not exists(select 1 from public.appointments a
  where a.technician_id=t.user_id and a.status not in ('Cancelado','Reagendar')
  and tstzrange(a.starts_at,a.starts_at+make_interval(mins=>a.duration_minutes),'[)')
   && tstzrange(start_time,start_time+make_interval(mins=>mins),'[)'))
 order by t.full_name limit 1 for update;
 if chosen is null then raise exception 'SLOT_UNAVAILABLE'; end if;
 insert into public.appointments(client_name,phone,city,service,notes,starts_at,duration_minutes,technician_id)
 values(trim(p_client_name),trim(p_phone),trim(p_city),trim(p_service),nullif(trim(p_notes),''),start_time,mins,chosen)
 returning id into new_id;
 return new_id;
end; $$;

grant execute on function public.available_dates(text) to anon,authenticated;
grant execute on function public.available_slots(date,text) to anon,authenticated;
grant execute on function public.book_appointment(text,text,text,text,text,date,text) to anon,authenticated;

-- Crie usuários em Authentication > Users e vincule cada técnico:
-- insert into public.technicians(user_id,full_name) values ('UUID_DO_USUARIO','Nome do técnico');
-- A agenda só exibe datas quando existir pelo menos um técnico ativo.
