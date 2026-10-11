-- =====================================================================
-- RavenDent — Stage 1: Supabase (Postgres) schema
-- Run in Supabase Dashboard > SQL Editor (once, on an empty project).
-- All times stored as timestamptz (UTC); clinic local time = clinic_settings.timezone.
-- Error codes raised by functions (catch in the app by message):
--   not_authenticated, profile_incomplete, service_unavailable,
--   slot_unavailable, not_found, not_reschedulable, not_cancellable,
--   deadline_passed, forbidden
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create type user_role as enum ('customer', 'receptionist', 'dentist', 'admin');
create type appointment_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

-- ---------------------------------------------------------------------
-- Clinic configuration (single row, admin-editable)
-- ---------------------------------------------------------------------
create table clinic_settings (
  id                        int primary key default 1 check (id = 1),
  clinic_name               text not null default 'RavenDent',
  address                   text,
  phone                     text,
  email                     text,
  timezone                  text not null default 'Asia/Manila',
  slot_interval_minutes     int  not null default 30 check (slot_interval_minutes between 5 and 120),
  min_notice_hours          int  not null default 4,
  booking_horizon_days      int  not null default 60,
  cancel_deadline_hours     int  not null default 24,
  reschedule_deadline_hours int  not null default 24,
  reminder_hours_before     int  not null default 24,
  require_approval          boolean not null default false
);
insert into clinic_settings (id, address, phone, email)
values (1, 'Sample Street, Cebu City, Philippines', '+63 900 000 0000', 'hello@ravendent.example');

create table clinic_hours (
  weekday     smallint primary key check (weekday between 0 and 6),  -- 0 = Sunday
  is_closed   boolean not null default false,
  open_time   time,
  close_time  time,
  break_start time,
  break_end   time,
  check (is_closed or (open_time is not null and close_time is not null and close_time > open_time)),
  check ((break_start is null) = (break_end is null))
);

-- ---------------------------------------------------------------------
-- Users / roles
-- ---------------------------------------------------------------------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null default 'customer',
  full_name  text not null default '',
  email      text not null,
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          new.email,
          new.raw_user_meta_data->>'phone');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create function current_role_of() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and is_active
$$;

create function has_role(variadic r user_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_role_of() = any(r), false)
$$;

-- Block privilege escalation: only admins can change role / is_active
create function guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and not has_role('admin') then
    raise exception 'forbidden';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on profiles
  for each row execute function guard_profile_update();

-- ---------------------------------------------------------------------
-- Patient data (row exists = section completed; consent timestamps required)
-- ---------------------------------------------------------------------
create table patient_profiles (
  user_id                  uuid primary key references profiles(id) on delete cascade,
  legal_name               text not null,
  date_of_birth            date not null,
  phone                    text not null,
  address                  text,
  emergency_contact_name   text not null,
  emergency_contact_phone  text not null,
  reason_for_consultation  text,
  privacy_consent_at       timestamptz not null,
  updated_at               timestamptz not null default now()
);

create table medical_information (
  user_id                 uuid primary key references profiles(id) on delete cascade,
  allergies               text,
  conditions              text,
  medications             text,
  previous_dental_concerns text,
  health_data_consent_at  timestamptz not null,
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Dentists, services, schedules
-- ---------------------------------------------------------------------
create table dentists (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid unique references profiles(id) on delete set null,
  display_name   text not null,
  qualifications text,
  bio            text,
  photo_url      text,
  is_active      boolean not null default true
);

create table dental_services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  description      text,
  price_min        numeric(10,2),
  price_max        numeric(10,2),
  duration_minutes int not null check (duration_minutes between 5 and 480),
  prep_instructions text,
  requires_approval boolean not null default false,
  is_active        boolean not null default true,
  sort_order       int not null default 0
);

create table dentist_availability (   -- weekly working windows
  id         uuid primary key default gen_random_uuid(),
  dentist_id uuid not null references dentists(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time)
);
create index on dentist_availability (weekday, dentist_id);

create table blocked_slots (          -- holidays, leave, maintenance (dentist_id null = whole clinic)
  id         uuid primary key default gen_random_uuid(),
  dentist_id uuid references dentists(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  kind       text not null default 'blocked' check (kind in ('holiday', 'leave', 'blocked')),
  reason     text,
  created_by uuid references profiles(id),
  check (ends_at > starts_at)
);
create index on blocked_slots using gist (tstzrange(starts_at, ends_at));

-- ---------------------------------------------------------------------
-- Appointments (double-booking impossible at DB level)
-- ---------------------------------------------------------------------
create table appointments (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique,
  patient_id       uuid not null references profiles(id),
  dentist_id       uuid not null references dentists(id),
  service_id       uuid not null references dental_services(id),
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  status           appointment_status not null,
  notes            text,
  reminder_sent_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint no_double_booking
    exclude using gist (dentist_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status in ('pending', 'confirmed'))
);
create index on appointments (patient_id, starts_at);
create index on appointments (starts_at) where status in ('pending', 'confirmed');

create table appointment_tokens (     -- QR payload = random token (no personal data)
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  token          text not null unique,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  revoked_at     timestamptz
);
create unique index one_active_token_per_appt on appointment_tokens (appointment_id) where is_active;

create table appointment_history (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  actor_id       uuid references profiles(id),
  action         text not null,
  old_values     jsonb,
  new_values     jsonb,
  created_at     timestamptz not null default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

create table audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references profiles(id),
  action     text not null,
  entity     text,
  entity_id  text,
  details    jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Availability engine (internal) — returns every bookable slot for a day
-- ---------------------------------------------------------------------
create function _slots(
  p_date date, p_duration int, p_dentist uuid,
  p_ignore_bookings boolean, p_exclude uuid default null
) returns table (slot_start timestamptz, slot_end timestamptz, dentist_id uuid)
language sql stable security definer set search_path = public as $$
  select x.st, x.st + make_interval(mins => p_duration), d.id
  from clinic_settings s
  join clinic_hours ch
    on ch.weekday = extract(dow from p_date)::int and not ch.is_closed
  join dentist_availability da on da.weekday = ch.weekday
  join dentists d
    on d.id = da.dentist_id and d.is_active and (p_dentist is null or d.id = p_dentist)
  cross join lateral generate_series(
      p_date + greatest(ch.open_time, da.start_time),
      p_date + least(ch.close_time, da.end_time) - make_interval(mins => p_duration),
      make_interval(mins => s.slot_interval_minutes)
  ) as g(ts)
  cross join lateral (select g.ts at time zone s.timezone as st) x
  where s.id = 1
    and p_date <= (now() at time zone s.timezone)::date + s.booking_horizon_days
    and x.st >= now() + make_interval(hours => s.min_notice_hours)
    and (ch.break_start is null
         or not (g.ts::time < ch.break_end
                 and (g.ts + make_interval(mins => p_duration))::time > ch.break_start))
    and not exists (
      select 1 from blocked_slots b
      where (b.dentist_id is null or b.dentist_id = d.id)
        and tstzrange(b.starts_at, b.ends_at)
            && tstzrange(x.st, x.st + make_interval(mins => p_duration)))
    and (p_ignore_bookings or not exists (
      select 1 from appointments a
      where a.dentist_id = d.id
        and a.status in ('pending', 'confirmed')
        and a.id is distinct from p_exclude
        and tstzrange(a.starts_at, a.ends_at)
            && tstzrange(x.st, x.st + make_interval(mins => p_duration))))
$$;

-- Public: slots for one day (no patient data ever returned)
create function get_available_slots(p_date date, p_service_id uuid, p_dentist_id uuid default null)
returns table (slot_start timestamptz, slot_end timestamptz, dentist_id uuid)
language sql stable security definer set search_path = public as $$
  select * from _slots(
    p_date,
    (select duration_minutes from dental_services where id = p_service_id and is_active),
    p_dentist_id, false)
  order by 1, 3
$$;

-- Public: month view -> 'closed' | 'full' | 'partial' | 'available'
-- ('closed' also covers past days and days with no slots left inside the notice window)
create function get_month_availability(p_month date, p_service_id uuid, p_dentist_id uuid default null)
returns table (out_day date, out_status text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_dur int; v_d date; v_total int; v_avail int;
  v_start date := date_trunc('month', p_month)::date;
begin
  select duration_minutes into v_dur from dental_services where id = p_service_id and is_active;
  for v_d in
    select generate_series(v_start, (v_start + interval '1 month')::date - 1, interval '1 day')::date
  loop
    select count(distinct slot_start) into v_total from _slots(v_d, v_dur, p_dentist_id, true);
    select count(distinct slot_start) into v_avail from _slots(v_d, v_dur, p_dentist_id, false);
    out_day := v_d;
    out_status := case
      when v_total = 0 then 'closed'
      when v_avail = 0 then 'full'
      when v_avail < v_total then 'partial'
      else 'available' end;
    return next;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Booking / rescheduling / cancelling (atomic, called by logged-in users)
-- ---------------------------------------------------------------------
create function book_appointment(
  p_service_id uuid, p_dentist_id uuid, p_start timestamptz, p_notes text default null
) returns table (out_id uuid, out_reference text, out_token text,
                 out_status appointment_status, out_starts_at timestamptz, out_ends_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_set clinic_settings; v_svc dental_services;
  v_dentist uuid; v_status appointment_status; v_id uuid;
  v_ref text; v_tok text; v_end timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from patient_profiles where user_id = v_uid)
     or not exists (select 1 from medical_information where user_id = v_uid) then
    raise exception 'profile_incomplete';
  end if;

  select * into v_set from clinic_settings where id = 1;
  select * into v_svc from dental_services where id = p_service_id and is_active;
  if not found then raise exception 'service_unavailable'; end if;

  v_end := p_start + make_interval(mins => v_svc.duration_minutes);

  select s.dentist_id into v_dentist
  from _slots((p_start at time zone v_set.timezone)::date, v_svc.duration_minutes, p_dentist_id, false) s
  where s.slot_start = p_start
  order by s.dentist_id limit 1;
  if v_dentist is null then raise exception 'slot_unavailable'; end if;

  v_status := case when v_svc.requires_approval or v_set.require_approval
                   then 'pending'::appointment_status else 'confirmed'::appointment_status end;
  v_ref := 'RD-' || to_char(now() at time zone v_set.timezone, 'YYMMDD') || '-'
           || upper(encode(gen_random_bytes(4), 'hex'));
  v_tok := encode(gen_random_bytes(18), 'hex');

  begin
    insert into appointments (reference, patient_id, dentist_id, service_id, starts_at, ends_at, status, notes)
    values (v_ref, v_uid, v_dentist, p_service_id, p_start, v_end, v_status, p_notes)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'slot_unavailable';
  end;

  insert into appointment_tokens (appointment_id, token) values (v_id, v_tok);
  insert into appointment_history (appointment_id, actor_id, action, new_values)
  values (v_id, v_uid, 'created',
          jsonb_build_object('starts_at', p_start, 'ends_at', v_end, 'dentist_id', v_dentist,
                             'service_id', p_service_id, 'status', v_status));
  insert into notifications (user_id, type, title, body)
  values (v_uid, 'appointment_' || v_status::text,
          case when v_status = 'confirmed' then 'Appointment confirmed' else 'Appointment pending approval' end,
          'Reference ' || v_ref);

  return query select v_id, v_ref, v_tok, v_status, p_start, v_end;
end $$;

create function reschedule_appointment(
  p_appointment_id uuid, p_new_start timestamptz,
  p_new_service_id uuid default null, p_new_dentist_id uuid default null
) returns table (out_id uuid, out_reference text, out_token text,
                out_status appointment_status, out_starts_at timestamptz, out_ends_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_is_staff boolean := has_role('admin', 'receptionist');
  v_set clinic_settings; v_appt appointments; v_svc dental_services;
  v_dentist uuid; v_status appointment_status; v_tok text; v_end timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_set from clinic_settings where id = 1;

  select * into v_appt from appointments where id = p_appointment_id for update;  -- row lock
  if not found or (v_appt.patient_id <> v_uid and not v_is_staff) then raise exception 'not_found'; end if;
  if v_appt.status not in ('pending', 'confirmed') then raise exception 'not_reschedulable'; end if;
  if not v_is_staff
     and v_appt.starts_at < now() + make_interval(hours => v_set.reschedule_deadline_hours) then
    raise exception 'deadline_passed';
  end if;

  select * into v_svc from dental_services
  where id = coalesce(p_new_service_id, v_appt.service_id) and is_active;
  if not found then raise exception 'service_unavailable'; end if;

  v_end := p_new_start + make_interval(mins => v_svc.duration_minutes);

  -- p_exclude = this appointment, so its own old time doesn't block the new one
  select s.dentist_id into v_dentist
  from _slots((p_new_start at time zone v_set.timezone)::date, v_svc.duration_minutes,
              p_new_dentist_id, false, v_appt.id) s
  where s.slot_start = p_new_start
  order by (s.dentist_id = v_appt.dentist_id) desc, s.dentist_id limit 1;
  if v_dentist is null then raise exception 'slot_unavailable'; end if;

  v_status := case
    when v_is_staff then v_appt.status
    when v_svc.requires_approval or v_set.require_approval then 'pending'::appointment_status
    else 'confirmed'::appointment_status end;

  begin  -- single UPDATE: old slot is released and new one reserved atomically
    update appointments
       set dentist_id = v_dentist, service_id = v_svc.id, starts_at = p_new_start,
           ends_at = v_end, status = v_status, reminder_sent_at = null, updated_at = now()
     where id = v_appt.id;
  exception when exclusion_violation then
    raise exception 'slot_unavailable';
  end;

  update appointment_tokens set is_active = false, revoked_at = now()
   where appointment_id = v_appt.id and is_active;
  v_tok := encode(gen_random_bytes(18), 'hex');
  insert into appointment_tokens (appointment_id, token) values (v_appt.id, v_tok);

  insert into appointment_history (appointment_id, actor_id, action, old_values, new_values)
  values (v_appt.id, v_uid, 'rescheduled',
          jsonb_build_object('starts_at', v_appt.starts_at, 'ends_at', v_appt.ends_at,
                             'dentist_id', v_appt.dentist_id, 'service_id', v_appt.service_id),
          jsonb_build_object('starts_at', p_new_start, 'ends_at', v_end,
                             'dentist_id', v_dentist, 'service_id', v_svc.id));
  insert into notifications (user_id, type, title, body)
  values (v_appt.patient_id, 'appointment_rescheduled', 'Appointment rescheduled',
          'Reference ' || v_appt.reference);

  return query select v_appt.id, v_appt.reference, v_tok, v_status, p_new_start, v_end;
end $$;

create function cancel_appointment(p_appointment_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_is_staff boolean := has_role('admin', 'receptionist');
  v_set clinic_settings; v_appt appointments;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_set from clinic_settings where id = 1;

  select * into v_appt from appointments where id = p_appointment_id for update;
  if not found or (v_appt.patient_id <> v_uid and not v_is_staff) then raise exception 'not_found'; end if;
  if v_appt.status not in ('pending', 'confirmed') then raise exception 'not_cancellable'; end if;
  if not v_is_staff
     and v_appt.starts_at < now() + make_interval(hours => v_set.cancel_deadline_hours) then
    raise exception 'deadline_passed';
  end if;

  update appointments set status = 'cancelled', updated_at = now() where id = v_appt.id;
  update appointment_tokens set is_active = false, revoked_at = now()
   where appointment_id = v_appt.id and is_active;

  insert into appointment_history (appointment_id, actor_id, action, old_values, new_values)
  values (v_appt.id, v_uid, 'cancelled',
          jsonb_build_object('status', v_appt.status),
          jsonb_build_object('status', 'cancelled', 'reason', p_reason));
  insert into notifications (user_id, type, title, body)
  values (v_appt.patient_id, 'appointment_cancelled', 'Appointment cancelled',
          'Reference ' || v_appt.reference);
end $$;

-- Staff only: verify by scanned QR token OR typed reference (manual fallback)
create function verify_appointment(p_code text)
returns table (out_id uuid, out_reference text, out_patient text, out_service text, out_dentist text,
               out_starts_at timestamptz, out_ends_at timestamptz,
               out_status appointment_status, out_valid boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not has_role('admin', 'receptionist', 'dentist') then raise exception 'forbidden'; end if;
  insert into audit_logs (actor_id, action, entity) values (auth.uid(), 'verify_appointment', 'appointment');

  return query
  select a.id, a.reference, p.full_name, s.name, d.display_name, a.starts_at, a.ends_at, a.status,
         (a.status = 'confirmed'
          and (a.reference = upper(p_code) or coalesce(t.is_active, false)))
  from appointments a
  join profiles p on p.id = a.patient_id
  join dental_services s on s.id = a.service_id
  join dentists d on d.id = a.dentist_id
  left join appointment_tokens t on t.appointment_id = a.id and t.token = p_code
  where a.reference = upper(p_code) or t.id is not null;
end $$;

-- Function permissions (Supabase grants execute to everyone by default)
revoke execute on function _slots(date, int, uuid, boolean, uuid) from public, anon, authenticated;
revoke execute on function book_appointment(uuid, uuid, timestamptz, text) from public, anon;
revoke execute on function reschedule_appointment(uuid, timestamptz, uuid, uuid) from public, anon;
revoke execute on function cancel_appointment(uuid, text) from public, anon;
revoke execute on function verify_appointment(text) from public, anon;
grant execute on function get_available_slots(date, uuid, uuid) to anon, authenticated;
grant execute on function get_month_availability(date, uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table clinic_settings      enable row level security;
alter table clinic_hours         enable row level security;
alter table profiles             enable row level security;
alter table patient_profiles     enable row level security;
alter table medical_information  enable row level security;
alter table dentists             enable row level security;
alter table dental_services      enable row level security;
alter table dentist_availability enable row level security;
alter table blocked_slots        enable row level security;
alter table appointments         enable row level security;
alter table appointment_tokens   enable row level security;
alter table appointment_history  enable row level security;
alter table notifications        enable row level security;
alter table audit_logs           enable row level security;

-- Public read (no sensitive data in these)
create policy settings_read on clinic_settings for select using (true);
create policy hours_read    on clinic_hours    for select using (true);
create policy services_read on dental_services for select using (is_active or has_role('admin'));
create policy dentists_read on dentists        for select using (is_active or has_role('admin'));

-- Admin write
create policy settings_admin on clinic_settings for all using (has_role('admin')) with check (has_role('admin'));
create policy hours_admin    on clinic_hours    for all using (has_role('admin')) with check (has_role('admin'));
create policy services_admin on dental_services for all using (has_role('admin')) with check (has_role('admin'));
create policy dentists_admin on dentists        for all using (has_role('admin')) with check (has_role('admin'));
create policy avail_read     on dentist_availability for select using (has_role('admin', 'receptionist', 'dentist'));
create policy avail_admin    on dentist_availability for all using (has_role('admin')) with check (has_role('admin'));
create policy blocked_read   on blocked_slots for select using (has_role('admin', 'receptionist', 'dentist'));
create policy blocked_admin  on blocked_slots for all using (has_role('admin', 'receptionist')) with check (has_role('admin', 'receptionist'));

-- Profiles
create policy profiles_select on profiles for select
  using (id = auth.uid() or has_role('admin', 'receptionist', 'dentist'));
create policy profiles_update_self on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on profiles for update using (has_role('admin')) with check (has_role('admin'));

-- Patient + medical data (medical: owner, dentists, admins — NOT receptionists)
create policy patient_owner on patient_profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy patient_staff on patient_profiles for select
  using (has_role('admin', 'receptionist', 'dentist'));
create policy medical_owner on medical_information for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy medical_clinical on medical_information for select
  using (has_role('admin', 'dentist'));

-- Appointments (customers change them only through the RPC functions above)
create policy appt_select on appointments for select using (
  patient_id = auth.uid()
  or has_role('admin', 'receptionist')
  or exists (select 1 from dentists d where d.id = appointments.dentist_id and d.profile_id = auth.uid()));
create policy appt_staff_update on appointments for update
  using (has_role('admin', 'receptionist')) with check (has_role('admin', 'receptionist'));

create policy tokens_select on appointment_tokens for select using (
  has_role('admin', 'receptionist')
  or exists (select 1 from appointments a where a.id = appointment_id and a.patient_id = auth.uid()));
create policy history_select on appointment_history for select using (
  has_role('admin', 'receptionist')
  or exists (select 1 from appointments a where a.id = appointment_id and a.patient_id = auth.uid()));

create policy notif_select on notifications for select using (user_id = auth.uid());
create policy notif_update on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy audit_admin  on audit_logs for select using (has_role('admin'));

-- ---------------------------------------------------------------------
-- Seed data (fictional)
-- ---------------------------------------------------------------------
insert into clinic_hours (weekday, is_closed, open_time, close_time, break_start, break_end) values
  (0, true,  null,    null,    null,    null),
  (1, false, '08:00', '18:00', '12:00', '13:00'),
  (2, false, '08:00', '18:00', '12:00', '13:00'),
  (3, false, '08:00', '18:00', '12:00', '13:00'),
  (4, false, '08:00', '18:00', '12:00', '13:00'),
  (5, false, '08:00', '18:00', '12:00', '13:00'),
  (6, false, '09:00', '15:00', null,    null);

insert into dental_services (name, description, price_min, price_max, duration_minutes, prep_instructions, sort_order) values
  ('Dental Consultation & Examination', 'Full oral exam and treatment advice.',            500,  800,  30, 'Bring any previous dental records.', 1),
  ('Dental Cleaning (Prophylaxis)',     'Scaling and polishing to remove plaque/tartar.',   800, 1500,  45, 'Brush and floss beforehand.',        2),
  ('Tooth Filling',                     'Restoration of a decayed tooth.',                  800, 2500,  60, null,                                 3),
  ('Tooth Extraction',                  'Removal of a damaged or problematic tooth.',      1000, 3500,  60, 'Eat lightly before your visit.',      4),
  ('Root Canal Treatment',              'Treatment of infected tooth pulp.',               5000, 12000, 90, 'Take medication as advised by your dentist.', 5),
  ('Teeth Whitening',                   'In-clinic professional whitening.',               4000, 9000,  60, null,                                 6),
  ('Braces Consultation',               'Assessment and options for orthodontic treatment.', 500, 1000, 30, null,                                 7),
  ('Denture Consultation',              'Assessment for partial or full dentures.',         500, 1000,  30, null,                                 8);

update dental_services set requires_approval = true where name in ('Root Canal Treatment', 'Braces Consultation', 'Denture Consultation');

insert into dentists (display_name, qualifications, bio) values
  ('Dr. Elena Cruz',   'DMD, General & Restorative Dentistry', 'Fictional demo dentist.'),
  ('Dr. Marco Reyes',  'DMD, Endodontics',                      'Fictional demo dentist.'),
  ('Dr. Sofia Tan',    'DMD, Orthodontics',                     'Fictional demo dentist.');

insert into dentist_availability (dentist_id, weekday, start_time, end_time)
select d.id, w, '08:00', '18:00' from dentists d, generate_series(1, 5) w;
insert into dentist_availability (dentist_id, weekday, start_time, end_time)
select d.id, 6, '09:00', '15:00' from dentists d where d.display_name <> 'Dr. Sofia Tan';

-- ---------------------------------------------------------------------
-- Test accounts: create these in Dashboard > Authentication > Users
-- (tick "Auto Confirm"), then promote with:
--   update profiles set role = 'admin'        where email = 'admin@ravendent.test';
--   update profiles set role = 'receptionist' where email = 'reception@ravendent.test';
--   update profiles set role = 'dentist'      where email = 'dentist@ravendent.test';
--   update dentists set profile_id = (select id from profiles where email = 'dentist@ravendent.test')
--     where display_name = 'Dr. Elena Cruz';
-- Customers need no promotion (default role).
-- ---------------------------------------------------------------------
