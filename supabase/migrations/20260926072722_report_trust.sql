SET local check_function_bodies = off;

DROP VIEW "public"."latest_report_per_component";

DROP VIEW "public"."repair_time_by_component";

DROP VIEW "public"."report_counts_by_category";

DROP VIEW "public"."report_counts_by_component";

DROP VIEW "public"."report_counts_by_zone";

DROP VIEW "public"."team_performance";

DROP VIEW "public"."report_repair_days";

CREATE TABLE "private"."report_sources" (
  "report_id"    uuid                     NOT NULL,
  "reporter_key" text                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "report_sources_pkey" PRIMARY KEY (report_id)
);

ALTER TABLE "private"."report_sources"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."reports"
  ADD COLUMN "photo_lat" double precision;

ALTER TABLE "public"."reports"
  ADD COLUMN "photo_lon" double precision;

ALTER TABLE "public"."reports"
  ADD COLUMN "photo_taken_at" timestamp WITH time zone;

ALTER TABLE "public"."reports"
  ADD COLUMN "photo_distance_m" double precision;

ALTER TABLE "public"."reports"
  ADD COLUMN "reviewed_by" uuid;

ALTER TABLE "public"."reports"
  ADD COLUMN "reviewed_at" timestamp WITH time zone;

ALTER TABLE "public"."reports"
  ADD COLUMN "review_note" text;

CREATE TYPE "public"."photo_location_check" AS ENUM (
  'match',
  'mismatch',
  'missing'
);

ALTER TABLE "public"."reports"
  ADD COLUMN "photo_check" public.photo_location_check NOT NULL DEFAULT 'missing'::public.photo_location_check;

CREATE TYPE "public"."report_review" AS ENUM (
  'unreviewed',
  'confirmed',
  'rejected'
);

ALTER TABLE "public"."reports"
  ADD COLUMN "review_status" public.report_review NOT NULL DEFAULT 'unreviewed'::public.report_review;

CREATE OR REPLACE FUNCTION private.reporter_key()
  RETURNS text
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select case
    when auth.uid() is not null then 'user:' || auth.uid()::text
    when auth.role() = 'anon' then
      'ip:' || encode(extensions.digest(coalesce(private.request_ip(), 'unknown'), 'sha256'), 'hex')
  end
$function$;

CREATE OR REPLACE FUNCTION private.request_ip()
  RETURNS text
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select nullif(btrim(coalesce(
    h ->> 'cf-connecting-ip',
    h ->> 'x-real-ip',
    (string_to_array(h ->> 'x-forwarded-for', ','))[
      cardinality(string_to_array(h ->> 'x-forwarded-for', ','))]
  )), '')
  from (select nullif(current_setting('request.headers', true), '')::json as h) headers
$function$;

CREATE OR REPLACE FUNCTION public.check_report_submission()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  key text := private.reporter_key();
  per_hour integer := CASE WHEN auth.uid() IS NULL THEN 3 ELSE 5 END;
  per_day integer := CASE WHEN auth.uid() IS NULL THEN 10 ELSE 20 END;
BEGIN
  IF auth.role() IN ('anon', 'authenticated') THEN
    NEW.review_status := 'unreviewed';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.review_note := NULL;
  END IF;

  IF key IS NOT NULL THEN
    IF (SELECT count(*) FROM private.report_sources
        WHERE reporter_key = key AND created_at > now() - interval '1 hour') >= per_hour
       OR (SELECT count(*) FROM private.report_sources
           WHERE reporter_key = key AND created_at > now() - interval '1 day') >= per_day THEN
      RAISE EXCEPTION 'You have sent a lot of reports recently. Please try again later.'
        USING ERRCODE = 'P0001', HINT = 'rate_limited';
    END IF;

    IF NEW.component_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM private.report_sources s
      JOIN public.reports r ON r.id = s.report_id
      WHERE s.reporter_key = key
        AND r.component_id = NEW.component_id
        AND r.status <> 'resolved'
        AND r.review_status <> 'rejected'
    ) THEN
      RAISE EXCEPTION 'You already have an open report on %. It will update when staff record work on it.',
        NEW.component_id
        USING ERRCODE = 'P0001', HINT = 'duplicate_report';
    END IF;
  END IF;

  NEW.photo_distance_m := NULL;
  IF NEW.photo_lat IS NOT NULL AND NEW.photo_lon IS NOT NULL THEN
    SELECT extensions.st_distance(
             c.location,
             extensions.st_setsrid(extensions.st_makepoint(NEW.photo_lon, NEW.photo_lat), 4326)::extensions.geography)
    INTO NEW.photo_distance_m
    FROM public.components c
    WHERE c.name = NEW.component_id;
  END IF;
  NEW.photo_check := CASE
    WHEN NEW.photo_distance_m IS NULL THEN 'missing'
    WHEN NEW.photo_distance_m <= 100 THEN 'match'
    ELSE 'mismatch'
  END;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."check_report_submission"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.dashboard_overview (
  p_month_start timestamp with time zone DEFAULT date_trunc('month'::text, now())
)
  RETURNS TABLE (
    fixed_this_month    integer,
    pending_issues      integer,
    average_repair_days numeric,
    total_staff         integer
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select
    (select count(*) from public.reports
      where status = 'resolved' and resolved_at >= p_month_start
        and review_status <> 'rejected')::integer,
    (select count(*) from public.reports
      where status = 'pending' and review_status <> 'rejected')::integer,
    (select coalesce(round(avg(repair_days), 1), 0) from public.report_repair_days),
    (select count(*) from public.profiles where role in ('staff', 'admin'))::integer
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
BEGIN
  IF staff_agency IS NULL THEN
    RAISE EXCEPTION 'Only agency staff can record maintenance.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.maintenance
    (component_type, component_name, agency_id, performed_by, status, description, evidence_image)
  VALUES
    (p_component_type, p_component_name, staff_agency, auth.uid(), p_status,
     nullif(btrim(p_description), ''), p_evidence_image)
  RETURNING * INTO result;

  UPDATE public.reports
  SET status = p_status::text::public.report_status,
      resolved_by_maintenance_id = result.id,
      resolved_image = coalesce(p_evidence_image, resolved_image),
      resolved_at = CASE WHEN p_status = 'resolved' THEN result.performed_at ELSE resolved_at END
  WHERE component_id = p_component_name
    AND created_at <= result.performed_at
    AND review_status <> 'rejected'
    AND status = ANY (CASE WHEN p_status = 'resolved'
                           THEN ARRAY['pending', 'in-progress']::public.report_status[]
                           ELSE ARRAY['pending']::public.report_status[] END);

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_report_source()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  key text := private.reporter_key();
BEGIN
  IF key IS NOT NULL THEN
    INSERT INTO private.report_sources (report_id, reporter_key) VALUES (NEW.id, key);
  END IF;
  DELETE FROM private.report_sources
  WHERE reporter_key LIKE 'ip:%' AND created_at < now() - interval '30 days';
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."record_report_source"() FROM PUBLIC, "anon", "authenticated";

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

  UPDATE public.reports
  SET review_status = p_verdict,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = note,
      priority = coalesce(p_priority, priority)
  WHERE id = p_report_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'No such report.' USING ERRCODE = 'P0002';
  END IF;
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."review_report"(uuid, public.report_review, text, public.report_priority) FROM PUBLIC, "anon";

ALTER TABLE "private"."report_sources"
  ADD CONSTRAINT "report_sources_report_id_fkey" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_photo_lat_range" CHECK (((photo_lat >= ('-90'::integer)::double precision) AND (photo_lat <= (90)::double precision)));

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_photo_lon_range" CHECK (((photo_lon >= ('-180'::integer)::double precision) AND (photo_lon <= (180)::double precision)));

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE VIEW "public"."latest_report_per_component" WITH (security_invoker=true) AS  SELECT DISTINCT ON (component_id) id,
    created_at,
    category,
    description,
    image,
    reporter_name,
    status,
    component_id,
    long,
    lat,
    geocoded_status,
    address,
    user_id,
    priority,
    zone,
    resolved_at,
    resolved_by_maintenance_id,
    resolved_image,
    photo_lat,
    photo_lon,
    photo_taken_at,
    photo_distance_m,
    photo_check,
    review_status,
    reviewed_by,
    reviewed_at,
    review_note
   FROM public.reports
  WHERE ((component_id IS NOT NULL) AND (review_status <> 'rejected'::public.report_review))
  ORDER BY component_id, created_at DESC;

CREATE VIEW "public"."report_counts_by_category" WITH (security_invoker=true) AS  SELECT category,
    (count(*))::integer AS report_count
   FROM public.reports
  WHERE ((category IS NOT NULL) AND (review_status <> 'rejected'::public.report_review))
  GROUP BY category;

CREATE VIEW "public"."report_counts_by_component" WITH (security_invoker=true) AS  SELECT category,
    component_id,
    (count(*))::integer AS report_count
   FROM public.reports
  WHERE ((component_id IS NOT NULL) AND (review_status <> 'rejected'::public.report_review))
  GROUP BY category, component_id;

CREATE VIEW "public"."report_counts_by_zone" WITH (security_invoker=true) AS  SELECT zone,
    (count(*))::integer AS report_count
   FROM public.reports
  WHERE ((zone IS NOT NULL) AND (review_status <> 'rejected'::public.report_review))
  GROUP BY zone;

CREATE VIEW "public"."report_repair_days" WITH (security_invoker=true) AS  SELECT id,
    category,
    component_id,
    created_at,
    resolved_at,
    (EXTRACT(epoch FROM (resolved_at - created_at)) / 86400.0) AS repair_days
   FROM public.reports
  WHERE ((status = 'resolved'::public.report_status) AND (resolved_at IS NOT NULL) AND (resolved_at >= created_at) AND (review_status <> 'rejected'::public.report_review));

CREATE VIEW "public"."repair_time_by_component" WITH (security_invoker=true) AS  SELECT category AS component_type,
    round(avg(repair_days), 1) AS average_days,
    (count(*))::integer AS resolved_count
   FROM public.report_repair_days
  WHERE (category IS NOT NULL)
  GROUP BY category;

CREATE VIEW "public"."team_performance" WITH (security_invoker=true) AS  SELECT a.name AS agency_name,
    (count(r.id))::integer AS total_issues,
    (count(r.id) FILTER (WHERE (r.status = 'resolved'::public.report_status)))::integer AS resolved_issues,
    (count(r.id) FILTER (WHERE (r.status <> 'resolved'::public.report_status)))::integer AS outstanding_issues,
    round((percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((d.repair_days)::double precision)))::numeric, 1) AS median_days_to_resolve
   FROM (((public.agencies a
     JOIN public.maintenance m ON ((m.agency_id = a.id)))
     JOIN public.reports r ON (((r.resolved_by_maintenance_id = m.id) AND (r.review_status <> 'rejected'::public.report_review))))
     LEFT JOIN public.report_repair_days d ON ((d.id = r.id)))
  GROUP BY a.id, a.name;

CREATE INDEX idx_report_sources_created_at ON private.report_sources USING btree (created_at);

CREATE INDEX idx_report_sources_key_created ON private.report_sources USING btree (reporter_key, created_at DESC);

CREATE INDEX idx_reports_reviewed_by ON public.reports USING btree (reviewed_by);

CREATE TRIGGER check_report_submission
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_report_submission();

CREATE TRIGGER record_report_source
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.record_report_source();

COMMENT ON COLUMN "public"."reports"."photo_distance_m" IS 'Metres from the photo''s GPS position to the component. Computed by check_report_submission; whatever the client sends is overwritten.';

COMMENT ON COLUMN "public"."reports"."photo_lat" IS 'Latitude from the photo''s EXIF GPS, sent by the reporter''s browser. Null when the photo had none.';

COMMENT ON COLUMN "public"."reports"."photo_taken_at" IS 'When the photo says it was taken (EXIF DateTimeOriginal), sent by the reporter''s browser.';

COMMENT ON COLUMN "public"."reports"."priority" IS 'Set by the reporter when filing; staff may change it when they review the report (review_report).';

COMMENT ON COLUMN "public"."reports"."review_status" IS 'Set only by review_report. New reports always start unreviewed.';

GRANT EXECUTE ON FUNCTION "private"."reporter_key"() TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."request_ip"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."check_report_submission"() TO "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."record_report_source"() TO "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."review_report"(uuid, public.report_review, text, public.report_priority) TO "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "private"."report_sources" TO "postgres";

GRANT USAGE ON TYPE "public"."photo_location_check" TO "postgres";

GRANT USAGE ON TYPE "public"."report_review" TO "postgres";

REVOKE ALL ON TABLE "public"."latest_report_per_component" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."latest_report_per_component" TO "anon";

REVOKE ALL ON TABLE "public"."latest_report_per_component" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."latest_report_per_component" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."latest_report_per_component" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."repair_time_by_component" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."repair_time_by_component" TO "anon";

REVOKE ALL ON TABLE "public"."repair_time_by_component" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."repair_time_by_component" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."repair_time_by_component" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."report_counts_by_category" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_category" TO "anon";

REVOKE ALL ON TABLE "public"."report_counts_by_category" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_category" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_counts_by_category" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."report_counts_by_component" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_component" TO "anon";

REVOKE ALL ON TABLE "public"."report_counts_by_component" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_component" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_counts_by_component" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."report_counts_by_zone" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_zone" TO "anon";

REVOKE ALL ON TABLE "public"."report_counts_by_zone" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_zone" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_counts_by_zone" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."report_repair_days" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_repair_days" TO "anon";

REVOKE ALL ON TABLE "public"."report_repair_days" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_repair_days" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_repair_days" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."team_performance" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."team_performance" TO "anon";

REVOKE ALL ON TABLE "public"."team_performance" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."team_performance" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."team_performance" TO "postgres", "service_role";
