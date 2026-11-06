SET local check_function_bodies = off;

DROP FUNCTION "public"."record_maintenance"(public.component_type, text, public.maintenance_status, text, text);

ALTER TABLE "public"."maintenance"
  ADD COLUMN "evidence_lat" double precision;

ALTER TABLE "public"."maintenance"
  ADD COLUMN "evidence_lon" double precision;

ALTER TABLE "public"."maintenance"
  ADD COLUMN "evidence_taken_at" timestamp WITH time zone;

ALTER TABLE "public"."maintenance"
  ADD COLUMN "evidence_distance_m" double precision;

CREATE OR REPLACE FUNCTION public.record_maintenance (
  p_component_type    public.component_type,
  p_component_name    text,
  p_status            public.maintenance_status,
  p_description       text                      DEFAULT NULL::text,
  p_evidence_image    text                      DEFAULT NULL::text,
  p_evidence_lat      double precision          DEFAULT NULL::double precision,
  p_evidence_lon      double precision          DEFAULT NULL::double precision,
  p_evidence_taken_at timestamp with time zone  DEFAULT NULL::timestamp WITH time zone
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
  evidence_distance double precision;
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
  -- The position and time describe the photo; without one they mean nothing.
  IF p_evidence_image IS NULL THEN
    p_evidence_lat := NULL; p_evidence_lon := NULL; p_evidence_taken_at := NULL;
  END IF;
  IF p_evidence_lat IS NOT NULL AND p_evidence_lon IS NOT NULL THEN
    SELECT extensions.st_distance(
             coalesce(c.path, c.location),
             extensions.st_setsrid(extensions.st_makepoint(p_evidence_lon, p_evidence_lat), 4326)::extensions.geography)
    INTO evidence_distance
    FROM public.components c
    WHERE c.name = p_component_name;
    IF evidence_distance > 50 THEN
      RAISE EXCEPTION 'Evidence must be from within 50 m of the component.' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF p_evidence_taken_at < now() - interval '12 hours' THEN
    RAISE EXCEPTION 'Evidence must be from within the last 12 hours.' USING ERRCODE = '22023';
  END IF;
  -- After the checks, so only work that is actually recorded is counted.
  IF NOT public.consume_rate_limit('record_maintenance') THEN
    RAISE EXCEPTION 'You have recorded a lot of work recently. Please try again later.'
      USING ERRCODE = 'P0001', HINT = 'rate_limited';
  END IF;

  INSERT INTO public.maintenance
    (component_type, component_name, agency_id, performed_by, status, description, evidence_image,
     evidence_lat, evidence_lon, evidence_taken_at, evidence_distance_m)
  VALUES
    (p_component_type, p_component_name, staff_agency, auth.uid(), p_status,
     nullif(btrim(p_description), ''), p_evidence_image,
     p_evidence_lat, p_evidence_lon, p_evidence_taken_at, evidence_distance)
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

REVOKE ALL
  ON FUNCTION "public"."record_maintenance"(public.component_type, text, public.maintenance_status, text, text, double precision, double precision, timestamp WITH time zone)
  FROM PUBLIC, "anon";

COMMENT ON COLUMN "public"."maintenance"."evidence_distance_m" IS 'Metres from the photo''s position to the component (a pipe''s whole run), computed by record_maintenance; null = unverified. Staff-only.';

COMMENT ON COLUMN "public"."maintenance"."evidence_lat" IS 'Where the evidence photo says it was taken (its EXIF, read by the app); null when it carried no position. Staff-only: no column grant, and nothing shows it yet.';

COMMENT ON COLUMN "public"."maintenance"."evidence_lon" IS 'See evidence_lat.';

COMMENT ON COLUMN "public"."maintenance"."evidence_taken_at" IS 'When the evidence photo says it was taken; null when it carried no time. Staff-only.';

GRANT EXECUTE
  ON FUNCTION "public"."record_maintenance"(public.component_type, text, public.maintenance_status, text, text, double precision, double precision, timestamp WITH time zone)
  TO "authenticated", "postgres", "service_role";
