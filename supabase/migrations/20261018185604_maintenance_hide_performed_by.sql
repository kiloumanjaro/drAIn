SET local check_function_bodies = off;

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
  -- Clients can't read maintenance.performed_by (column grants below); the return must not leak it.
  result.performed_by := NULL;
  RETURN result;
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
  -- Clients can't read maintenance.performed_by (column grants in schema.sql); the return must not leak it.
  work.performed_by := NULL;
  RETURN work;
END;
$function$;
