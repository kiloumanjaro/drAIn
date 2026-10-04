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
-- stored hashed, and only in private.report_sources. Signed-out users can no
-- longer file reports (the INSERT policy in schema.sql), so the 'ip:' branch
-- is not reached today. It is kept so the limits still hold if anonymous
-- reporting ever returns.
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
-- dropped after 30 days (check_report_submission); signed-in keys stay with
-- their report. Rows are written before their report exists (see
-- check_report_submission), so the foreign key is checked at commit.
CREATE TABLE IF NOT EXISTS "private"."report_sources" (
    "report_id" "uuid" NOT NULL,
    "reporter_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "report_sources_pkey" PRIMARY KEY ("report_id"),
    CONSTRAINT "report_sources_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);


ALTER TABLE "private"."report_sources" OWNER TO "postgres";


ALTER TABLE "private"."report_sources" ENABLE ROW LEVEL SECURITY;


CREATE INDEX "idx_report_sources_key_created" ON "private"."report_sources" USING "btree" ("reporter_key", "created_at" DESC);


CREATE INDEX "idx_report_sources_created_at" ON "private"."report_sources" USING "btree" ("created_at");


-- ---------------------------------------------------------------------------
-- Checks on every new report
-- ---------------------------------------------------------------------------

-- Runs before a report is stored. For API callers it:
--   * sets the columns only the server writes, whatever the client sent:
--     created_at (now), the review fields (only review_report sets them),
--     resolved_at (record_maintenance), and address and geocoded_status
--     (the geocodeWorker);
--   * accepts only a photo named the way the app uploads it,
--     public/<uuid>.<ext> (the ReportImage upload policy's pattern);
--   * refuses a reporter's second open report on the same component;
--   * refuses more than 5 an hour or 10 a day from a signed-in reporter, or
--     3 and 10 from one signed-out address.
-- For every insert it measures the photo's GPS position against the
-- component and sets photo_distance_m and photo_check, overwriting whatever
-- the client sent.
--
-- The limits count private.report_sources, and each report's row there is
-- written here, before the next report is checked. It used to be written by
-- an AFTER trigger, so every row of a multi-row INSERT was checked against
-- the count from before the statement, and one request could file any
-- number of reports. A per-reporter advisory lock makes concurrent requests
-- take turns, so two at once can't both pass on the same count.
-- reject_bulk_report_insert below also refuses multi-row inserts outright.
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
  per_day integer := 10;
BEGIN
  IF private.is_api_caller() THEN
    NEW.created_at := now();
    NEW.review_status := 'unreviewed';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.review_note := NULL;
    NEW.resolved_at := NULL;
    NEW.address := NULL;
    NEW.geocoded_status := 'pending';
    IF NEW.image IS NOT NULL
       AND NEW.image !~ '^public/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,5}$' THEN
      RAISE EXCEPTION 'The photo must be uploaded through the app.' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('report_submission:' || key));

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

    INSERT INTO private.report_sources (report_id, reporter_key) VALUES (NEW.id, key);
  END IF;
  DELETE FROM private.report_sources
  WHERE reporter_key LIKE 'ip:%' AND created_at < now() - interval '30 days';

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


-- One report per request from the API. The app never sends more, and a
-- multi-row INSERT was how the limits above were once skipped.
CREATE OR REPLACE FUNCTION "public"."reject_bulk_report_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF private.is_api_caller()
     AND (SELECT count(*) FROM new_reports) > 1 THEN
    RAISE EXCEPTION 'File one report at a time.' USING ERRCODE = 'P0001', HINT = 'rate_limited';
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."reject_bulk_report_insert"() OWNER TO "postgres";


CREATE OR REPLACE TRIGGER "check_report_submission" BEFORE INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."check_report_submission"();


CREATE OR REPLACE TRIGGER "reject_bulk_report_insert" AFTER INSERT ON "public"."reports" REFERENCING NEW TABLE AS "new_reports" FOR EACH STATEMENT EXECUTE FUNCTION "public"."reject_bulk_report_insert"();


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
REVOKE ALL ON FUNCTION "public"."reject_bulk_report_insert"() FROM PUBLIC, "anon", "authenticated";


-- ---------------------------------------------------------------------------
-- Checking finished work
-- ---------------------------------------------------------------------------
--
-- Resolving a report used to be self-attested: the crew that did the work
-- said it was done, and that was the end of it. Now a resolved maintenance
-- record stays 'unverified' until someone other than the person who did it
-- looks: another staff member (review_maintenance), or a citizen whose
-- report it closed (respond_to_resolution). A dispute reopens the reports,
-- so the component goes back on the work list.

-- One reviewer's verdict on one piece of finished work. A reviewer may
-- change their mind; their latest verdict replaces the earlier one.
CREATE TABLE IF NOT EXISTS "public"."maintenance_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "maintenance_id" "uuid" NOT NULL,
    "reviewer_id" "uuid",
    "reviewer_kind" "text" NOT NULL,
    "report_id" "uuid",
    "verdict" "public"."review_verdict" NOT NULL,
    "note" "text",
    "evidence_image" "text",
    CONSTRAINT "maintenance_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "maintenance_reviews_one_per_reviewer" UNIQUE ("maintenance_id", "reviewer_id"),
    CONSTRAINT "maintenance_reviews_reviewer_kind_check" CHECK (("reviewer_kind" = ANY (ARRAY['staff'::"text", 'reporter'::"text"]))),
    CONSTRAINT "maintenance_reviews_maintenance_id_fkey" FOREIGN KEY ("maintenance_id") REFERENCES "public"."maintenance"("id") ON DELETE CASCADE,
    CONSTRAINT "maintenance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
    CONSTRAINT "maintenance_reviews_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE SET NULL
);


ALTER TABLE "public"."maintenance_reviews" OWNER TO "postgres";


COMMENT ON COLUMN "public"."maintenance_reviews"."reviewer_kind" IS 'staff: another agency member checked the work. reporter: the citizen whose report it closed.';



COMMENT ON COLUMN "public"."maintenance_reviews"."report_id" IS 'For a reporter''s review, the report they answered for.';



CREATE INDEX "idx_maintenance_reviews_reviewer_id" ON "public"."maintenance_reviews" USING "btree" ("reviewer_id");


CREATE INDEX "idx_maintenance_reviews_report_id" ON "public"."maintenance_reviews" USING "btree" ("report_id");


ALTER TABLE "public"."maintenance_reviews" ENABLE ROW LEVEL SECURITY;


-- Staff see every review; a citizen sees their own. Written only through
-- the two functions below.
CREATE POLICY "Staff and the reviewer can read reviews" ON "public"."maintenance_reviews" FOR SELECT TO "authenticated" USING (((( SELECT "private"."current_agency_id"() AS "current_agency_id") IS NOT NULL) OR ("reviewer_id" = ( SELECT "auth"."uid"() AS "uid"))));


GRANT SELECT ON TABLE "public"."maintenance_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_reviews" TO "service_role";
REVOKE ALL ON TABLE "public"."maintenance_reviews" FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE "public"."maintenance_reviews" FROM "authenticated";


-- Recomputes a record's verification_status from its reviews: any dispute
-- wins, then any confirmation.
CREATE OR REPLACE FUNCTION "private"."refresh_verification"("p_maintenance_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  update public.maintenance m
  set verification_status = case
    when exists (select 1 from public.maintenance_reviews r
                 where r.maintenance_id = m.id and r.verdict = 'disputed') then 'disputed'
    when exists (select 1 from public.maintenance_reviews r
                 where r.maintenance_id = m.id and r.verdict = 'confirmed') then 'verified'
    else 'unverified'
  end::public.verification_status
  where m.id = p_maintenance_id
$$;


ALTER FUNCTION "private"."refresh_verification"("p_maintenance_id" "uuid") OWNER TO "postgres";


-- Puts reports this work closed back on the work list: all of them, or only
-- one reporter's. The review keeps the link to the disputed work.
CREATE OR REPLACE FUNCTION "private"."reopen_resolved_reports"("p_maintenance_id" "uuid", "p_reporter" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  update public.reports
  set status = 'pending',
      resolved_at = null,
      resolved_image = null,
      resolved_by_maintenance_id = null
  where resolved_by_maintenance_id = p_maintenance_id
    and status = 'resolved'
    and (p_reporter is null or user_id = p_reporter)
$$;


ALTER FUNCTION "private"."reopen_resolved_reports"("p_maintenance_id" "uuid", "p_reporter" "uuid") OWNER TO "postgres";


-- A staff member checks a colleague's finished work: confirmed, or disputed
-- with a reason (and optionally a photo). Not their own work. A dispute
-- reopens every report the work closed.
CREATE OR REPLACE FUNCTION "public"."review_maintenance"("p_maintenance_id" "uuid", "p_verdict" "public"."review_verdict", "p_note" "text" DEFAULT NULL::"text", "p_evidence_image" "text" DEFAULT NULL::"text") RETURNS "public"."maintenance"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  note text := nullif(btrim(p_note), '');
  work public.maintenance;
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

  INSERT INTO public.maintenance_reviews
    (maintenance_id, reviewer_id, reviewer_kind, verdict, note, evidence_image)
  VALUES (work.id, auth.uid(), 'staff', p_verdict, note, p_evidence_image)
  ON CONFLICT (maintenance_id, reviewer_id) DO UPDATE
    SET verdict = excluded.verdict, note = excluded.note,
        evidence_image = excluded.evidence_image, created_at = now();

  IF p_verdict = 'disputed' THEN
    PERFORM private.reopen_resolved_reports(work.id);
  END IF;
  PERFORM private.refresh_verification(work.id);

  SELECT * INTO work FROM public.maintenance WHERE id = p_maintenance_id;
  RETURN work;
END;
$$;


ALTER FUNCTION "public"."review_maintenance"("p_maintenance_id" "uuid", "p_verdict" "public"."review_verdict", "p_note" "text", "p_evidence_image" "text") OWNER TO "postgres";


-- The citizen whose report was marked fixed says whether it is. Within 30
-- days of the fix. "Not fixed" (with a reason) reopens their report.
CREATE OR REPLACE FUNCTION "public"."respond_to_resolution"("p_report_id" "uuid", "p_verdict" "public"."review_verdict", "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."reports"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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

  SELECT * INTO report FROM public.reports WHERE id = p_report_id;
  RETURN report;
END;
$$;


ALTER FUNCTION "public"."respond_to_resolution"("p_report_id" "uuid", "p_verdict" "public"."review_verdict", "p_note" "text") OWNER TO "postgres";


REVOKE ALL ON FUNCTION "public"."review_maintenance"("p_maintenance_id" "uuid", "p_verdict" "public"."review_verdict", "p_note" "text", "p_evidence_image" "text") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."review_maintenance"("p_maintenance_id" "uuid", "p_verdict" "public"."review_verdict", "p_note" "text", "p_evidence_image" "text") TO "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."respond_to_resolution"("p_report_id" "uuid", "p_verdict" "public"."review_verdict", "p_note" "text") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."respond_to_resolution"("p_report_id" "uuid", "p_verdict" "public"."review_verdict", "p_note" "text") TO "authenticated", "service_role";
