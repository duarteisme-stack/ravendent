-- =====================================================================
-- RavenDent Stage 5 migration. Run AFTER 001_init.sql and 002_booking.sql.
-- Adds: audit log inserts for staff, dashboard/report statistics, staff status changes.
-- =====================================================================

-- Staff may write audit entries as themselves (admins read them)
drop policy if exists audit_insert on audit_logs;
create policy audit_insert on audit_logs for insert
  with check (has_role('admin', 'receptionist', 'dentist') and actor_id = auth.uid());

-- Appointments the current staff member is allowed to see in aggregates
create or replace function _appt_scope() returns setof appointments
language sql stable security definer set search_path = public as $$
  select a.* from appointments a
  where case current_role_of()
    when 'admin' then true
    when 'receptionist' then true
    when 'dentist' then a.dentist_id in (select id from dentists where profile_id = auth.uid())
    else false end
$$;
revoke execute on function _appt_scope() from public, anon, authenticated;

-- Dashboard numbers, computed in the database (no row limits) in clinic local time
create or replace function admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text; v_today date; v_role user_role := current_role_of();
begin
  if v_role is null or v_role = 'customer' then raise exception 'forbidden'; end if;
  select timezone into v_tz from clinic_settings where id = 1;
  v_today := (now() at time zone v_tz)::date;

  return jsonb_build_object(
    'today_count', (select count(*) from _appt_scope() a
        where (a.starts_at at time zone v_tz)::date = v_today and a.status in ('pending', 'confirmed', 'completed')),
    'pending_count', (select count(*) from _appt_scope() a where a.status = 'pending' and a.ends_at > now()),
    'patients_count', case when v_role = 'dentist'
        then (select count(distinct patient_id) from _appt_scope())
        else (select count(*) from profiles where role = 'customer') end,
    'cancelled_30d', (select count(*) from _appt_scope() a
        where a.status = 'cancelled' and (a.starts_at at time zone v_tz)::date between v_today - 29 and v_today),
    'daily', coalesce((
        select jsonb_agg(jsonb_build_object(
            'day', g.day,
            'booked', (select count(*) from _appt_scope() a where (a.starts_at at time zone v_tz)::date = g.day and a.status <> 'cancelled'),
            'completed', (select count(*) from _appt_scope() a where (a.starts_at at time zone v_tz)::date = g.day and a.status = 'completed'))
          order by g.day)
        from (select generate_series(v_today - 29, v_today, interval '1 day')::date as day) g), '[]'::jsonb),
    'upcoming', coalesce((
        select jsonb_agg(jsonb_build_object(
            'day', g.day,
            'count', (select count(*) from _appt_scope() a where (a.starts_at at time zone v_tz)::date = g.day and a.status in ('pending', 'confirmed')))
          order by g.day)
        from (select generate_series(v_today, v_today + 13, interval '1 day')::date as day) g), '[]'::jsonb),
    'by_weekday', coalesce((
        select jsonb_agg(jsonb_build_object(
            'dow', d.dow,
            'count', (select count(*) from _appt_scope() a
                where extract(dow from (a.starts_at at time zone v_tz)::date) = d.dow
                  and a.status <> 'cancelled'
                  and (a.starts_at at time zone v_tz)::date between v_today - 90 and v_today + 60))
          order by d.dow)
        from generate_series(0, 6) as d(dow)), '[]'::jsonb),
    'by_service', coalesce((
        select jsonb_agg(jsonb_build_object('name', t.n, 'count', t.c) order by t.c desc)
        from (select s.name n, count(*) c from _appt_scope() a join dental_services s on s.id = a.service_id
              where a.status <> 'cancelled'
                and (a.starts_at at time zone v_tz)::date between v_today - 90 and v_today + 60
              group by s.name order by c desc limit 8) t), '[]'::jsonb),
    'patients_split', (
        select jsonb_build_object(
          'new', count(*) filter (where not exists (
                   select 1 from _appt_scope() b where b.patient_id = r.patient_id and b.created_at < now() - interval '30 days')),
          'returning', count(*) filter (where exists (
                   select 1 from _appt_scope() b where b.patient_id = r.patient_id and b.created_at < now() - interval '30 days')))
        from (select distinct a.patient_id from _appt_scope() a
              where (a.starts_at at time zone v_tz)::date between v_today - 29 and v_today and a.status <> 'cancelled') r)
  );
end $$;

-- Report for a local date range (inclusive)
create or replace function admin_report(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_tz text; v_role user_role := current_role_of();
begin
  if v_role is null or v_role = 'customer' then raise exception 'forbidden'; end if;
  select timezone into v_tz from clinic_settings where id = 1;
  return jsonb_build_object(
    'total', (select count(*) from _appt_scope() a where (a.starts_at at time zone v_tz)::date between p_from and p_to),
    'by_status', coalesce((select jsonb_agg(jsonb_build_object('name', t.n, 'count', t.c) order by t.c desc)
        from (select a.status::text n, count(*) c from _appt_scope() a
              where (a.starts_at at time zone v_tz)::date between p_from and p_to group by 1) t), '[]'::jsonb),
    'by_service', coalesce((select jsonb_agg(jsonb_build_object('name', t.n, 'count', t.c) order by t.c desc)
        from (select s.name n, count(*) c from _appt_scope() a join dental_services s on s.id = a.service_id
              where (a.starts_at at time zone v_tz)::date between p_from and p_to and a.status <> 'cancelled' group by 1) t), '[]'::jsonb),
    'by_dentist', coalesce((select jsonb_agg(jsonb_build_object('name', t.n, 'count', t.c) order by t.c desc)
        from (select d.display_name n, count(*) c from _appt_scope() a join dentists d on d.id = a.dentist_id
              where (a.starts_at at time zone v_tz)::date between p_from and p_to and a.status <> 'cancelled' group by 1) t), '[]'::jsonb)
  );
end $$;

-- Staff status changes with history and patient notification.
-- admin/receptionist: pending->confirmed|cancelled, confirmed->completed|no_show|cancelled
-- dentist (own appointments only): confirmed->completed|no_show
create or replace function staff_set_status(
  p_appointment_id uuid, p_status appointment_status, p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_role user_role := current_role_of(); v_appt appointments; v_ok boolean;
begin
  if v_role is null or v_role = 'customer' then raise exception 'forbidden'; end if;

  select * into v_appt from appointments where id = p_appointment_id for update;
  if not found then raise exception 'not_found'; end if;

  if v_role = 'dentist' then
    if not exists (select 1 from dentists where id = v_appt.dentist_id and profile_id = v_uid) then raise exception 'forbidden'; end if;
    v_ok := v_appt.status = 'confirmed' and p_status in ('completed', 'no_show');
  else
    v_ok := (v_appt.status = 'pending' and p_status in ('confirmed', 'cancelled'))
         or (v_appt.status = 'confirmed' and p_status in ('completed', 'no_show', 'cancelled'));
  end if;
  if not v_ok then raise exception 'invalid_transition'; end if;

  update appointments set status = p_status, updated_at = now() where id = v_appt.id;

  if p_status <> 'confirmed' then
    update appointment_tokens set is_active = false, revoked_at = now() where appointment_id = v_appt.id and is_active;
  end if;

  insert into appointment_history (appointment_id, actor_id, action, old_values, new_values)
  values (v_appt.id, v_uid, 'status_' || p_status::text,
          jsonb_build_object('status', v_appt.status), jsonb_build_object('status', p_status, 'note', p_note));

  if p_status in ('confirmed', 'cancelled', 'no_show') then
    insert into notifications (user_id, type, title, body)
    values (v_appt.patient_id, 'appointment_' || p_status::text,
            case p_status when 'confirmed' then 'Appointment confirmed'
                          when 'cancelled' then 'Appointment cancelled by the clinic'
                          else 'Missed appointment' end,
            'Reference ' || v_appt.reference || coalesce('. ' || nullif(p_note, ''), ''));
  end if;
end $$;

revoke execute on function admin_dashboard_stats() from public, anon;
revoke execute on function admin_report(date, date) from public, anon;
revoke execute on function staff_set_status(uuid, appointment_status, text) from public, anon;
