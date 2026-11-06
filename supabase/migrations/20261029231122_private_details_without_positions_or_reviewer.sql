SET local check_function_bodies = off;

DROP FUNCTION "public"."report_private_details"(uuid[]);

CREATE OR REPLACE FUNCTION public.my_reports()
  RETURNS SETOF public.reports
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select (jsonb_populate_record(r, '{"reviewed_by": null}'::jsonb)).*
  from public.reports r where r.user_id = (select auth.uid())
$function$;

CREATE OR REPLACE FUNCTION public.report_private_details (
  p_report_ids uuid[]
)
  RETURNS TABLE (
    id               uuid,
    is_mine          boolean,
    photo_taken_at   timestamp with time zone,
    photo_distance_m double precision
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  IF cardinality(p_report_ids) > 100 THEN
    RAISE EXCEPTION 'Ask for at most 100 reports at a time.' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    SELECT r.id, r.user_id IS NOT DISTINCT FROM auth.uid() AND auth.uid() IS NOT NULL,
           r.photo_taken_at, r.photo_distance_m
    FROM public.reports r
    WHERE r.id = ANY (p_report_ids)
      AND (r.user_id = (SELECT auth.uid())
           OR (SELECT private.current_agency_id()) IS NOT NULL);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."report_private_details"(uuid[]) FROM PUBLIC, "anon";

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
  -- The reporter's own row, but who reviewed it stays private (as in my_reports).
  report.reviewed_by := NULL;
  RETURN report;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."report_private_details"(uuid[]) TO "authenticated", "postgres", "service_role";
