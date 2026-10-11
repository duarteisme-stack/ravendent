-- =====================================================================
-- RavenDent Stage 4 migration. Run AFTER 001_init.sql (SQL Editor).
-- Adds: booking limits, reschedule-aware availability, rate limiting.
-- New error codes: too_many_active, rate_limited
-- =====================================================================

alter table clinic_settings add column if not exists max_active_appointments int not null default 5;

-- Availability functions gain an optional p_exclude_appointment so a patient (or staff) rescheduling
-- can move an appointment into a time that overlaps its own current slot. Ignored for anyone else.
drop function if exists get_available_slots(date, uuid, uuid);
drop function if exists get_month_availability(date, uuid, uuid);

create function get_available_slots(
  p_date date, p_service_id uuid, p_dentist_id uuid default null, p_exclude_appointment uuid default null
) returns table (slot_start timestamptz, slot_end timestamptz, dentist_id uuid)
language sql stable security definer set search_path = public as $$
  select * from _slots(
    p_date,
    (select duration_minutes from dental_services where id = p_service_id and is_active),
    p_dentist_id, false,
    (select a.id from appointments a
      where a.id = p_exclude_appointment
        and (a.patient_id = auth.uid() or has_role('admin', 'receptionist'))))
  order by 1, 3
$$;

create function get_month_availability(
  p_month date, p_service_id uuid, p_dentist_id uuid default null, p_exclude_appointment uuid default null
) returns table (out_day date, out_status text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_dur int; v_d date; v_total int; v_avail int; v_ex uuid;
  v_start date := date_trunc('month', p_month)::date;
begin
  select duration_minutes into v_dur from dental_services where id = p_service_id and is_active;
  select a.id into v_ex from appointments a
   where a.id = p_exclude_appointment
     and (a.patient_id = auth.uid() or has_role('admin', 'receptionist'));
  for v_d in
    select generate_series(v_start, (v_start + interval '1 month')::date - 1, interval '1 day')::date
  loop
    select count(distinct slot_start) into v_total from _slots(v_d, v_dur, p_dentist_id, true);
    select count(distinct slot_start) into v_avail from _slots(v_d, v_dur, p_dentist_id, false, v_ex);
    out_day := v_d;
    out_status := case
      when v_total = 0 then 'closed'
      when v_avail = 0 then 'full'
      when v_avail < v_total then 'partial'
      else 'available' end;
    return next;
  end loop;
end $$;

grant execute on function get_available_slots(date, uuid, uuid, uuid) to anon, authenticated;
grant execute on function get_month_availability(date, uuid, uuid, uuid) to anon, authenticated;

-- book_appointment: adds active-appointment cap and hourly action limit
create or replace function book_appointment(
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

  if (select count(*) from appointments
       where patient_id = v_uid and status in ('pending', 'confirmed') and ends_at > now()) >= v_set.max_active_appointments then
    raise exception 'too_many_active';
  end if;
  if (select count(*) from appointment_history
       where actor_id = v_uid and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate_limited';
  end if;

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
    values (v_ref, v_uid, v_dentist, p_service_id, p_start, v_end, v_status, left(p_notes, 500))
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

-- reschedule_appointment: same as before plus the hourly action limit for customers
create or replace function reschedule_appointment(
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

  select * into v_appt from appointments where id = p_appointment_id for update;
  if not found or (v_appt.patient_id <> v_uid and not v_is_staff) then raise exception 'not_found'; end if;
  if v_appt.status not in ('pending', 'confirmed') then raise exception 'not_reschedulable'; end if;
  if not v_is_staff
     and v_appt.starts_at < now() + make_interval(hours => v_set.reschedule_deadline_hours) then
    raise exception 'deadline_passed';
  end if;
  if not v_is_staff
     and (select count(*) from appointment_history
           where actor_id = v_uid and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate_limited';
  end if;

  select * into v_svc from dental_services
  where id = coalesce(p_new_service_id, v_appt.service_id) and is_active;
  if not found then raise exception 'service_unavailable'; end if;

  v_end := p_new_start + make_interval(mins => v_svc.duration_minutes);

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

  begin
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
