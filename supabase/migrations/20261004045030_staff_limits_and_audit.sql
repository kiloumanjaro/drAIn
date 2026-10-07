SET local check_function_bodies = off;

CREATE TABLE "private"."audit_log" (
  "id"              bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "at"              timestamp with time zone NOT NULL DEFAULT now(),
  "actor_id"        uuid,
  "actor_agency_id" uuid,
  "actor_role"      text                     NOT NULL,
  "action"          text                     NOT NULL,
  "target_type"     text                     NOT NULL,
  "target_id"       text                     NOT NULL,
  "details"         jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY (id)
);

ALTER TABLE "private"."audit_log"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.refuse_audit_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  RAISE EXCEPTION 'The audit log is append-only.' USING ERRCODE = '42501';
END;
$function$;

CREATE OR REPLACE FUNCTION private.write_audit (
  p_action      text,
  p_target_type text,
  p_target_id   text,
  p_details     jsonb DEFAULT '{}'::jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  INSERT INTO private.audit_log
    (actor_id, actor_agency_id, actor_role, action, target_type, target_id, details)
  VALUES
    (auth.uid(), private.current_agency_id(), coalesce(current_setting('role', true), 'none'),
     p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_rate_limit (
  p_bucket text
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  caller uuid := auth.uid();
  short_max integer;
  short_window interval;
  day_max integer;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Sign in first.' USING ERRCODE = '42501';
  END IF;

  CASE p_bucket
    WHEN 'chatbot' THEN
      short_max := 20; short_window := interval '10 minutes'; day_max := 100;
    WHEN 'join_agency' THEN
      short_max := 10; short_window := interval '1 hour'; day_max := 20;
    WHEN 'record_maintenance' THEN
      short_max := 30; short_window := interval '1 hour'; day_max := 200;
    WHEN 'review_report' THEN
      short_max := 120; short_window := interval '1 hour'; day_max := 500;
    WHEN 'review_maintenance' THEN
      short_max := 60; short_window := interval '1 hour'; day_max := 200;
    ELSE
      RAISE EXCEPTION 'Unknown rate limit %.', p_bucket USING ERRCODE = '22023';
  END CASE;

  PERFORM pg_advisory_xact_lock(hashtext('rate_limit:' || p_bucket || ':' || caller::text));

  IF (SELECT count(*) FROM private.rate_limit_events
      WHERE bucket = p_bucket AND user_id = caller
        AND created_at > now() - short_window) >= short_max
     OR (SELECT count(*) FROM private.rate_limit_events
         WHERE bucket = p_bucket AND user_id = caller
           AND created_at > now() - interval '1 day') >= day_max THEN
    RETURN false;
  END IF;

  INSERT INTO private.rate_limit_events (bucket, user_id) VALUES (p_bucket, caller);
  DELETE FROM private.rate_limit_events WHERE created_at < now() - interval '1 day';
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 100), ''));
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_agency (
  p_code text
)
  RETURNS public.agencies
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  candidate text := private.normalize_join_code(p_code);
  matched public.agencies;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to join an agency.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role <> 'citizen') THEN
    RAISE EXCEPTION 'You are already part of an agency. Leave it first.' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.consume_rate_limit('join_agency') THEN
    RAISE EXCEPTION 'Too many tries. Please wait an hour and try again.'
      USING ERRCODE = 'P0001', HINT = 'rate_limited';
  END IF;

  SELECT a.* INTO matched
  FROM private.agency_join_codes c
  JOIN public.agencies a ON a.id = c.agency_id
  WHERE c.code_hash = extensions.crypt(candidate, c.code_hash)
  LIMIT 1;

  IF matched.id IS NULL THEN
    PERFORM private.write_audit('agency.join_failed', 'profile', auth.uid()::text);
    RETURN NULL;
  END IF;

  UPDATE public.profiles SET role = 'staff', agency_id = matched.id WHERE id = auth.uid();
  PERFORM private.write_audit('agency.join', 'profile', auth.uid()::text,
                              jsonb_build_object('agency_id', matched.id));
  RETURN matched;
END;
$function$;

CREATE OR REPLACE FUNCTION public.leave_agency()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  left_agency uuid;
BEGIN
  SELECT agency_id INTO left_agency FROM public.profiles
  WHERE id = auth.uid() AND role = 'staff'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only agency staff can leave an agency.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.profiles SET role = 'citizen', agency_id = NULL WHERE id = auth.uid();
  PERFORM private.write_audit('agency.leave', 'profile', auth.uid()::text,
                              jsonb_build_object('agency_id', left_agency));
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_maintenance (
  p_component_type public.component_type,
  p_component_name text,
  p_status         public.maintenance_status,
  p_description    text                      DEFAULT NULL::text,
  p_evidence_image text                      DEFAULT NULL::text
)
  RETURNS public.maintenance
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  staff_agency uuid := private.current_agency_id();
  result public.maintenance;
  moved jsonb;
BEGIN
  IF staff_agency IS NULL THEN
    RAISE EXCEPTION 'Only agency staff can record maintenance.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.components c
                 WHERE c.name = p_component_name AND c.type = p_component_type) THEN
    RAISE EXCEPTION 'No % named %.', p_component_type, p_component_name
      USING ERRCODE = '22023';
  END IF;
  IF char_length(btrim(p_description)) > 2000 THEN
    RAISE EXCEPTION 'Keep the description under 2,000 characters.' USING ERRCODE = '22023';
  END IF;
  IF p_evidence_image IS NOT NULL AND NOT private.owns_report_photo(p_evidence_image) THEN
    RAISE EXCEPTION 'The photo must be uploaded through the app.' USING ERRCODE = '22023';
  END IF;
  -- After the checks, so only work that is actually recorded is counted.
  IF NOT public.consume_rate_limit('record_maintenance') THEN
    RAISE EXCEPTION 'You have recorded a lot of work recently. Please try again later.'
      USING ERRCODE = 'P0001', HINT = 'rate_limited';
  END IF;

  INSERT INTO public.maintenance
    (component_type, component_name, agency_id, performed_by, status, description, evidence_image)
  VALUES
    (p_component_type, p_component_name, staff_agency, auth.uid(), p_status,
     nullif(btrim(p_description), ''), p_evidence_image)
  RETURNING * INTO result;

  WITH open_reports AS (
    SELECT r.id, r.status
    FROM public.reports r
    WHERE r.component_id = p_component_name
      AND r.created_at <= result.performed_at
      AND r.review_status <> 'rejected'
      AND r.status = ANY (CASE WHEN p_status = 'resolved'
                               THEN ARRAY['pending', 'in-progress']::public.report_status[]
                               ELSE ARRAY['pending']::public.report_status[] END)
    FOR UPDATE
  ), updated AS (
    UPDATE public.reports r
    SET status = p_status::text::public.report_status,
        resolved_by_maintenance_id = result.id,
        -- The "photo after the fix" only exists once the work is resolved; an
        -- in-progress photo stays on the maintenance row alone.
        resolved_image = CASE WHEN p_status = 'resolved'
                              THEN coalesce(p_evidence_image, r.resolved_image)
                              ELSE r.resolved_image END,
        resolved_at = CASE WHEN p_status = 'resolved' THEN result.performed_at ELSE r.resolved_at END
    FROM open_reports o
    WHERE r.id = o.id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'status_before', o.status)), '[]'::jsonb)
  INTO moved
  FROM open_reports o;

  PERFORM private.write_audit('maintenance.record', 'maintenance', result.id::text,
    jsonb_build_object('component', p_component_name, 'status', p_status, 'reports', moved));
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.respond_to_resolution (
  p_report_id uuid,
  p_verdict   public.review_verdict,
  p_note      text                  DEFAULT NULL::text
)
  RETURNS public.reports
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  note text := nullif(btrim(p_note), '');
  report public.reports;
  work public.maintenance;
BEGIN
  SELECT * INTO report FROM public.reports WHERE id = p_report_id;
  IF auth.uid() IS NULL OR report.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the person who filed this report can say whether it was fixed.'
      USING ERRCODE = '42501';
  END IF;
  IF report.status <> 'resolved' OR report.resolved_by_maintenance_id IS NULL THEN
    RAISE EXCEPTION 'This report has not been marked fixed.' USING ERRCODE = 'P0001';
  END IF;
  IF report.resolved_at < now() - interval '30 days' THEN
    RAISE EXCEPTION 'This was marked fixed more than 30 days ago. File a new report instead.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO work FROM public.maintenance WHERE id = report.resolved_by_maintenance_id;
  IF work.performed_by = auth.uid() THEN
    RAISE EXCEPTION 'Someone other than the person who did the work has to check it.'
      USING ERRCODE = '42501';
  END IF;
  IF p_verdict = 'disputed' AND note IS NULL THEN
    RAISE EXCEPTION 'Say what is still wrong.' USING ERRCODE = '22023';
  END IF;
  IF char_length(note) > 1000 THEN
    RAISE EXCEPTION 'Keep the note under 1,000 characters.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.maintenance_reviews
    (maintenance_id, reviewer_id, reviewer_kind, report_id, verdict, note)
  VALUES (work.id, auth.uid(), 'reporter', report.id, p_verdict, note)
  ON CONFLICT (maintenance_id, reviewer_id) DO UPDATE
    SET verdict = excluded.verdict, note = excluded.note,
        report_id = excluded.report_id, created_at = now();

  IF p_verdict = 'disputed' THEN
    PERFORM private.reopen_resolved_reports(work.id, auth.uid());
  END IF;
  PERFORM private.refresh_verification(work.id);
  PERFORM private.write_audit('maintenance.response', 'maintenance', work.id::text,
    jsonb_build_object('verdict', p_verdict, 'note', note, 'report_id', report.id));

  SELECT * INTO report FROM public.reports WHERE id = p_report_id;
  RETURN report;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_maintenance (
  p_maintenance_id uuid,
  p_verdict        public.review_verdict,
  p_note           text                  DEFAULT NULL::text,
  p_evidence_image text                  DEFAULT NULL::text
)
  RETURNS public.maintenance
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  note text := nullif(btrim(p_note), '');
  work public.maintenance;
  previous public.review_verdict;
  reopened uuid[];
BEGIN
  IF private.current_agency_id() IS NULL THEN
    RAISE EXCEPTION 'Only agency staff can check maintenance.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO work FROM public.maintenance WHERE id = p_maintenance_id;
  IF work.id IS NULL THEN
    RAISE EXCEPTION 'No such maintenance record.' USING ERRCODE = 'P0002';
  END IF;
  IF work.status <> 'resolved' THEN
    RAISE EXCEPTION 'Only finished work can be checked.' USING ERRCODE = 'P0001';
  END IF;
  IF work.performed_by = auth.uid() THEN
    RAISE EXCEPTION 'Someone other than the person who did the work has to check it.'
      USING ERRCODE = '42501';
  END IF;
  IF p_verdict = 'disputed' AND note IS NULL THEN
    RAISE EXCEPTION 'Say what is still wrong.' USING ERRCODE = '22023';
  END IF;
  IF char_length(note) > 1000 THEN
    RAISE EXCEPTION 'Keep the note under 1,000 characters.' USING ERRCODE = '22023';
  END IF;
  IF p_evidence_image IS NOT NULL AND NOT private.owns_report_photo(p_evidence_image) THEN
    RAISE EXCEPTION 'The photo must be uploaded through the app.' USING ERRCODE = '22023';
  END IF;
  -- After the checks, so only checks that are actually made are counted.
  IF NOT public.consume_rate_limit('review_maintenance') THEN
    RAISE EXCEPTION 'You have checked a lot of work recently. Please try again later.'
      USING ERRCODE = 'P0001', HINT = 'rate_limited';
  END IF;

  SELECT r.verdict INTO previous FROM public.maintenance_reviews r
  WHERE r.maintenance_id = work.id AND r.reviewer_id = auth.uid();

  INSERT INTO public.maintenance_reviews
    (maintenance_id, reviewer_id, reviewer_kind, verdict, note, evidence_image)
  VALUES (work.id, auth.uid(), 'staff', p_verdict, note, p_evidence_image)
  ON CONFLICT (maintenance_id, reviewer_id) DO UPDATE
    SET verdict = excluded.verdict, note = excluded.note,
        evidence_image = excluded.evidence_image, created_at = now();

  IF p_verdict = 'disputed' THEN
    SELECT array_agg(r.id) INTO reopened FROM public.reports r
    WHERE r.resolved_by_maintenance_id = work.id AND r.status = 'resolved';
    PERFORM private.reopen_resolved_reports(work.id);
  END IF;
  PERFORM private.refresh_verification(work.id);

  PERFORM private.write_audit('maintenance.review', 'maintenance', work.id::text,
    jsonb_build_object('verdict', p_verdict, 'verdict_before', previous, 'note', note,
                       'reports_reopened', coalesce(to_jsonb(reopened), '[]'::jsonb)));

  SELECT * INTO work FROM public.maintenance WHERE id = p_maintenance_id;
  RETURN work;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_report (
  p_report_id uuid,
  p_verdict   public.report_review,
  p_note      text                   DEFAULT NULL::text,
  p_priority  public.report_priority DEFAULT NULL::public.report_priority
)
  RETURNS public.reports
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  note text := nullif(btrim(p_note), '');
  before public.reports;
  result public.reports;
BEGIN
  IF private.current_agency_id() IS NULL THEN
    RAISE EXCEPTION 'Only agency staff can review reports.' USING ERRCODE = '42501';
  END IF;
  IF p_verdict = 'unreviewed' THEN
    RAISE EXCEPTION 'Confirm or reject the report.' USING ERRCODE = '22023';
  END IF;
  IF p_verdict = 'rejected' AND note IS NULL THEN
    RAISE EXCEPTION 'Say why the report is rejected.' USING ERRCODE = '22023';
  END IF;
  IF char_length(note) > 1000 THEN
    RAISE EXCEPTION 'Keep the note under 1,000 characters.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO before FROM public.reports WHERE id = p_report_id FOR UPDATE;
  IF before.id IS NULL THEN
    RAISE EXCEPTION 'No such report.' USING ERRCODE = 'P0002';
  END IF;
  -- After the checks, so only reviews that are actually made are counted.
  IF NOT public.consume_rate_limit('review_report') THEN
    RAISE EXCEPTION 'You have reviewed a lot of reports recently. Please try again later.'
      USING ERRCODE = 'P0001', HINT = 'rate_limited';
  END IF;

  UPDATE public.reports
  SET review_status = p_verdict,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = note,
      priority = coalesce(p_priority, priority)
  WHERE id = p_report_id
  RETURNING * INTO result;

  PERFORM private.write_audit('report.review', 'report', p_report_id::text,
    jsonb_build_object(
      'before', jsonb_build_object('review_status', before.review_status,
                                   'review_note', before.review_note,
                                   'priority', before.priority,
                                   'reviewed_by', before.reviewed_by,
                                   'reviewed_at', before.reviewed_at),
      'after', jsonb_build_object('review_status', result.review_status,
                                  'review_note', result.review_note,
                                  'priority', result.priority)));
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rotate_agency_join_code (
  p_agency_id uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw text := '';
BEGIN
  IF NOT private.can_manage_agency(p_agency_id) THEN
    RAISE EXCEPTION 'Only an admin can rotate a join code.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE id = p_agency_id) THEN
    RAISE EXCEPTION 'No such agency.' USING ERRCODE = 'P0002';
  END IF;

  -- 256 is a multiple of 32, so taking each random byte mod 32 is unbiased.
  FOR i IN 1..10 LOOP
    raw := raw || substr(alphabet, 1 + get_byte(extensions.gen_random_bytes(1), 0) % 32, 1);
  END LOOP;

  INSERT INTO private.agency_join_codes (agency_id, code_hash, rotated_at)
  VALUES (p_agency_id, extensions.crypt(raw, extensions.gen_salt('bf')), now())
  ON CONFLICT (agency_id) DO UPDATE
    SET code_hash = excluded.code_hash, rotated_at = excluded.rotated_at;

  PERFORM private.write_audit('agency.code_rotated', 'agency', p_agency_id::text);
  RETURN substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 2);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_member_agency (
  p_user_id   uuid,
  p_agency_id uuid,
  p_role      public.user_role
)
  RETURNS public.profiles
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  target_agency uuid;
  target_role public.user_role;
  result public.profiles;
BEGIN
  IF NOT private.can_manage_agency(p_agency_id) THEN
    RAISE EXCEPTION 'Only an admin can change a role or agency.' USING ERRCODE = '42501';
  END IF;
  -- An admin demoting themselves could leave an agency with no admin.
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You can''t change your own role or agency; ask another admin.'
      USING ERRCODE = '42501';
  END IF;

  SELECT agency_id, role INTO target_agency, target_role
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such user.' USING ERRCODE = 'P0002';
  END IF;
  IF target_agency IS NOT NULL AND NOT private.can_manage_agency(target_agency) THEN
    RAISE EXCEPTION 'That person belongs to another agency.' USING ERRCODE = '42501';
  END IF;
  IF target_agency IS NULL AND private.is_api_caller() THEN
    RAISE EXCEPTION 'People join an agency with its join code.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET role = p_role,
      agency_id = CASE WHEN p_role = 'citizen' THEN NULL ELSE p_agency_id END
  WHERE id = p_user_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'No such user.' USING ERRCODE = 'P0002';
  END IF;
  PERFORM private.write_audit('agency.member_set', 'profile', p_user_id::text,
    jsonb_build_object('role_before', target_role, 'agency_before', target_agency,
                       'role', result.role, 'agency_id', result.agency_id));
  RETURN result;
END;
$function$;

ALTER TABLE "public"."maintenance"
  ADD CONSTRAINT "maintenance_description_length" CHECK ((char_length(description) <= 2000)) NOT VALID;

ALTER TABLE "public"."maintenance_reviews"
  ADD CONSTRAINT "maintenance_reviews_note_length" CHECK ((char_length(note) <= 1000)) NOT VALID;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_full_name_length" CHECK ((char_length(full_name) <= 100)) NOT VALID;

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_review_note_length" CHECK ((char_length(review_note) <= 1000)) NOT VALID;

CREATE INDEX idx_audit_log_actor ON private.audit_log USING btree (actor_id, at DESC);

CREATE INDEX idx_audit_log_target ON private.audit_log USING btree (target_type, target_id, at DESC);

CREATE TRIGGER audit_log_is_append_only
  BEFORE DELETE OR UPDATE ON private.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION private.refuse_audit_change();

CREATE TRIGGER audit_log_is_never_emptied
  BEFORE TRUNCATE ON private.audit_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION private.refuse_audit_change();

COMMENT ON COLUMN "private"."audit_log"."actor_id" IS 'Who did it. No foreign key: the row outlives the account. Null for a direct database session.';

COMMENT ON COLUMN "private"."audit_log"."actor_role" IS 'The database role the request ran as (authenticated, service_role), or none for a direct session.';

REVOKE ALL ON FUNCTION "private"."refuse_audit_change"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."refuse_audit_change"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."refuse_audit_change"() TO "postgres";

REVOKE ALL ON FUNCTION "private"."write_audit"(text, text, text, jsonb) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."write_audit"(text, text, text, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."write_audit"(text, text, text, jsonb) TO "postgres";

-- Hand-edited: how many existing rows the four NOT VALID length checks would
-- refuse. They are left as they are, but updating one fails until it is
-- shortened.
DO $$
DECLARE
  long_names bigint;
  long_descriptions bigint;
  long_review_notes bigint;
  long_check_notes bigint;
BEGIN
  SELECT count(*) INTO long_names FROM public.profiles WHERE char_length(full_name) > 100;
  SELECT count(*) INTO long_descriptions FROM public.maintenance WHERE char_length(description) > 2000;
  SELECT count(*) INTO long_review_notes FROM public.reports WHERE char_length(review_note) > 1000;
  SELECT count(*) INTO long_check_notes FROM public.maintenance_reviews WHERE char_length(note) > 1000;
  IF long_names + long_descriptions + long_review_notes + long_check_notes > 0 THEN
    RAISE WARNING 'Rows over the new length limits: % profile name(s), % maintenance description(s), % report review note(s), % maintenance review note(s). They are left as they are (NOT VALID), but updating them will fail until shortened.',
      long_names, long_descriptions, long_review_notes, long_check_notes;
  END IF;
END
$$;
