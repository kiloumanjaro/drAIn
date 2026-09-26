-- Trust in citizen reports and in finished work.
--
-- Citizen reports feed the dashboard and the check of the flood model, so a
-- few motivated people could push their own street up the work list. Three
-- guards, all enforced here rather than in the browser:
--   * limits: one open report per reporter per component, and a cap on how
--     many reports one reporter sends per hour and per day;
--   * a photo check: where the photo says it was taken, against the
--     component it is filed on;
--   * staff review: staff confirm or reject each report, and rejected
--     reports drop out of every count (see schema_dashboard.sql).
--
-- Loaded last (file names sort that way); builds on schema.sql.


-- ---------------------------------------------------------------------------
-- Who sent a report
-- ---------------------------------------------------------------------------

-- The caller's IP, as the API gateway passed it on, or null outside an API
-- request. Cloudflare's header first (hosted), then the gateway's own; the
-- last X-Forwarded-For hop is the one the nearest proxy added, so it is the
-- least spoofable part of that header.
CREATE OR REPLACE FUNCTION "private"."request_ip"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select nullif(btrim(coalesce(
    h ->> 'cf-connecting-ip',
    h ->> 'x-real-ip',
    (string_to_array(h ->> 'x-forwarded-for', ','))[
      cardinality(string_to_array(h ->> 'x-forwarded-for', ','))]
  )), '')
  from (select nullif(current_setting('request.headers', true), '')::json as h) headers
$$;


ALTER FUNCTION "private"."request_ip"() OWNER TO "postgres";


-- Who is filing, for limits: 'user:<id>' when signed in, 'ip:<sha256>' when
-- not, null for a direct database session (seeds, migrations, the SQL
-- editor) and the service role, which are not limited. The IP is only ever
-- stored hashed, and only in private.report_sources.
CREATE OR REPLACE FUNCTION "private"."reporter_key"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select case
    when auth.uid() is not null then 'user:' || auth.uid()::text
    when auth.role() = 'anon' then
      'ip:' || encode(extensions.digest(coalesce(private.request_ip(), 'unknown'), 'sha256'), 'hex')
  end
$$;


ALTER FUNCTION "private"."reporter_key"() OWNER TO "postgres";


-- Which reporter sent each report, so limits and duplicate checks work for
-- signed-out reporters too. Not exposed through the API. Hashed IPs are
-- dropped after 30 days (record_report_source); signed-in keys stay with
-- their report.
CREATE TABLE IF NOT EXISTS "private"."report_sources" (
    "report_id" "uuid" NOT NULL,
    "reporter_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "report_sources_pkey" PRIMARY KEY ("report_id"),
    CONSTRAINT "report_sources_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE
);


ALTER TABLE "private"."report_sources" OWNER TO "postgres";


ALTER TABLE "private"."report_sources" ENABLE ROW LEVEL SECURITY;


CREATE INDEX "idx_report_sources_key_created" ON "private"."report_sources" USING "btree" ("reporter_key", "created_at" DESC);


CREATE INDEX "idx_report_sources_created_at" ON "private"."report_sources" USING "btree" ("created_at");


-- ---------------------------------------------------------------------------
-- Checks on every new report
-- ---------------------------------------------------------------------------

-- Runs before a report is stored. For API callers it:
--   * clears the review fields (only review_report sets them);
--   * refuses a reporter's second open report on the same component;
--   * refuses more than 5 an hour or 20 a day from a signed-in reporter, or
--     3 and 10 from one signed-out address.
-- For every insert it measures the photo's GPS position against the
-- component and sets photo_distance_m and photo_check, overwriting whatever
-- the client sent.
--
-- SECURITY DEFINER to read private.report_sources. The error HINTs
-- ('rate_limited', 'duplicate_report') let the app tell the two apart.
CREATE OR REPLACE FUNCTION "public"."check_report_submission"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."check_report_submission"() OWNER TO "postgres";


-- Remembers who sent the report, once it is stored (the foreign key needs
-- the row), and forgets hashed IPs older than 30 days.
CREATE OR REPLACE FUNCTION "public"."record_report_source"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."record_report_source"() OWNER TO "postgres";


CREATE OR REPLACE TRIGGER "check_report_submission" BEFORE INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."check_report_submission"();


CREATE OR REPLACE TRIGGER "record_report_source" AFTER INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."record_report_source"();


-- ---------------------------------------------------------------------------
-- Staff review
-- ---------------------------------------------------------------------------

-- Staff confirm a report, or reject it with a reason, and may correct the
-- priority the reporter chose. A later review replaces an earlier one.
CREATE OR REPLACE FUNCTION "public"."review_report"("p_report_id" "uuid", "p_verdict" "public"."report_review", "p_note" "text" DEFAULT NULL::"text", "p_priority" "public"."report_priority" DEFAULT NULL::"public"."report_priority") RETURNS "public"."reports"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."review_report"("p_report_id" "uuid", "p_verdict" "public"."report_review", "p_note" "text", "p_priority" "public"."report_priority") OWNER TO "postgres";


REVOKE ALL ON FUNCTION "public"."review_report"("p_report_id" "uuid", "p_verdict" "public"."report_review", "p_note" "text", "p_priority" "public"."report_priority") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."review_report"("p_report_id" "uuid", "p_verdict" "public"."report_review", "p_note" "text", "p_priority" "public"."report_priority") TO "authenticated", "service_role";

-- Trigger functions are not meant to be called directly.
REVOKE ALL ON FUNCTION "public"."check_report_submission"() FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."record_report_source"() FROM PUBLIC, "anon", "authenticated";
