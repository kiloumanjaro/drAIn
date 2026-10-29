SET local check_function_bodies = off;

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
  -- Clients can't read these columns (column grants in schema.sql); the return must not leak them.
  result.user_id := NULL;
  result.photo_lat := NULL;
  result.photo_lon := NULL;
  result.photo_taken_at := NULL;
  result.photo_distance_m := NULL;
  result.reviewed_by := NULL;
  RETURN result;
END;
$function$;
