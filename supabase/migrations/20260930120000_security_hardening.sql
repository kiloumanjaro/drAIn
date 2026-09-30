-- Security hardening (2026-09-30). Written by hand: `declarative sync`
-- needs Docker, which wasn't available. The schema files in
-- supabase/schemas/ carry the same changes; run
--   npx supabase db schema declarative sync --no-apply
-- and expect "No schema changes found" (the one intended exception is the
-- data step at the end, which the diff can't see).
--
-- What changes:
--  1. Signed-in users lose table-wide SELECT on reports and get the same
--     column list as signed-out visitors. The private columns (user_id,
--     photo_lat, photo_lon, reviewed_by) are read through my_reports (own
--     reports) and report_private_details (reporter or staff).
--  2. The report limits count each report as it is checked (report_sources
--     is written by the BEFORE trigger, its foreign key now deferred), under
--     a per-reporter advisory lock; multi-row inserts from the API are
--     refused (reject_bulk_report_insert).
--  3. check_report_submission sets created_at, resolved_at, address and
--     geocoded_status for API inserts and accepts only app-made photo names.
--     New checks: lat/long ranges; image path shape and description length
--     (NOT VALID, see the notice this migration prints).
--  4. Report photo uploads: at most 10 a day per citizen, 100 per staff
--     member (can_upload_report_photo); bucket types narrowed to JPEG, PNG,
--     WebP and HEIC/HEIF on the hosted buckets (the data step at the end).
--  5. Agency admins manage only their own agency (can_manage_agency
--     replaces can_manage_members), and no longer bypass
--     protect_profile_privileges on their own row.
--  6. consume_rate_limit takes a per-caller advisory lock; new bucket
--     'join_agency' (10 an hour, 20 a day), used by join_agency, which now
--     returns null for a wrong code instead of raising.
--  7. anon/authenticated lose Postgres 17's MAINTAIN on the reference tables
--     and maintenance.
--  8. The geocode trigger reads its URL and secret from Vault instead of
--     carrying the service-role JWT in its arguments.
--
-- MANUAL STEPS ON THE HOSTED PROJECT (after applying this migration):
--   a. Create the Vault secrets the geocode trigger reads:
--        select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/geocodeWorker', 'geocode_worker_url');
--        select vault.create_secret('<long random string>', 'geocode_worker_secret');
--   b. Give the edge function the same secret and redeploy it without JWT
--      verification:
--        npx supabase secrets set GEOCODE_WORKER_SECRET=<same string>
--        npx supabase functions deploy geocodeWorker --no-verify-jwt
--   c. Rotate the service-role key (the old one sat in the dropped trigger).
--   d. If the notice below reports rows, clean them up, then
--        alter table public.reports validate constraint reports_image_path;
--        alter table public.reports validate constraint reports_description_length;

SET local check_function_bodies = off;


-- 5. Agency admin scope -----------------------------------------------------

CREATE OR REPLACE FUNCTION "private"."can_manage_agency"("p_agency_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(auth.role(), 'postgres') not in ('anon', 'authenticated')
         or (p_agency_id is not null
             and private.is_admin()
             and private.current_agency_id() = p_agency_id)
$$;

ALTER FUNCTION "private"."can_manage_agency"("p_agency_id" "uuid") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "private"."can_manage_agency"("p_agency_id" "uuid") FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION "public"."protect_profile_privileges"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' AND (NEW.role <> 'citizen' OR NEW.agency_id IS NOT NULL) THEN
      RAISE EXCEPTION 'New profiles start as citizens.' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role
                             OR NEW.agency_id IS DISTINCT FROM OLD.agency_id) THEN
      RAISE EXCEPTION 'Only an admin can change a role or agency.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."rotate_agency_join_code"("p_agency_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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

  RETURN substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 2);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."set_member_agency"("p_user_id" "uuid", "p_agency_id" "uuid", "p_role" "public"."user_role") RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  target_agency uuid;
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

  SELECT agency_id INTO target_agency FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such user.' USING ERRCODE = 'P0002';
  END IF;
  IF target_agency IS NOT NULL AND NOT private.can_manage_agency(target_agency) THEN
    RAISE EXCEPTION 'That person belongs to another agency.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET role = p_role,
      agency_id = CASE WHEN p_role = 'citizen' THEN NULL ELSE p_agency_id END
  WHERE id = p_user_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'No such user.' USING ERRCODE = 'P0002';
  END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."agency_members"("p_agency_id" "uuid") RETURNS TABLE("id" "uuid", "full_name" "text", "email" "text", "role" "public"."user_role", "account_created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT private.can_manage_agency(p_agency_id) THEN
    RAISE EXCEPTION 'Only an admin can list an agency''s members.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT p.id, p.full_name, u.email::text, p.role, p.created_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.agency_id = p_agency_id
    ORDER BY p.role DESC, p.full_name NULLS LAST, p.id;
END;
$$;

DROP FUNCTION "private"."can_manage_members"();


-- 6. Rate limits: lock, join_agency bucket -----------------------------------

CREATE OR REPLACE FUNCTION "public"."consume_rate_limit"("p_bucket" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;

CREATE OR REPLACE FUNCTION "public"."join_agency"("p_code" "text") RETURNS "public"."agencies"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    RETURN NULL;
  END IF;

  UPDATE public.profiles SET role = 'staff', agency_id = matched.id WHERE id = auth.uid();
  RETURN matched;
END;
$$;


-- 1. Private report columns ---------------------------------------------------

-- Revoking the table privilege first: a later table-level revoke would also
-- take away the column grants.
REVOKE SELECT ON TABLE "public"."reports" FROM "authenticated";

GRANT SELECT ("id", "created_at", "category", "description", "image", "reporter_name", "status", "component_id", "long", "lat", "geocoded_status", "address", "priority", "zone", "resolved_by_maintenance_id", "resolved_image", "resolved_at", "photo_taken_at", "photo_distance_m", "reviewed_at", "review_note", "photo_check", "review_status") ON TABLE "public"."reports" TO "authenticated";

CREATE OR REPLACE FUNCTION "public"."my_reports"() RETURNS SETOF "public"."reports"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select r.* from public.reports r where r.user_id = (select auth.uid())
$$;

ALTER FUNCTION "public"."my_reports"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."report_private_details"("p_report_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "photo_lat" double precision, "photo_lon" double precision, "reviewed_by" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select r.id, r.user_id, r.photo_lat, r.photo_lon, r.reviewed_by
  from public.reports r
  where r.id = p_report_id
    and (r.user_id = (select auth.uid())
         or (select private.current_agency_id()) is not null)
$$;

ALTER FUNCTION "public"."report_private_details"("p_report_id" "uuid") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."my_reports"() FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."my_reports"() TO "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."report_private_details"("p_report_id" "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."report_private_details"("p_report_id" "uuid") TO "authenticated", "service_role";


-- 2 and 3. Report submission checks --------------------------------------------

ALTER TABLE "private"."report_sources"
    ALTER CONSTRAINT "report_sources_report_id_fkey" DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION "public"."check_report_submission"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  key text := private.reporter_key();
  per_hour integer := CASE WHEN auth.uid() IS NULL THEN 3 ELSE 5 END;
  per_day integer := 10;
BEGIN
  IF auth.role() IN ('anon', 'authenticated') THEN
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

DROP TRIGGER "record_report_source" ON "public"."reports";

DROP FUNCTION "public"."record_report_source"();

CREATE OR REPLACE FUNCTION "public"."reject_bulk_report_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF auth.role() IN ('anon', 'authenticated')
     AND (SELECT count(*) FROM new_reports) > 1 THEN
    RAISE EXCEPTION 'File one report at a time.' USING ERRCODE = 'P0001', HINT = 'rate_limited';
  END IF;
  RETURN NULL;
END;
$$;

ALTER FUNCTION "public"."reject_bulk_report_insert"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."reject_bulk_report_insert"() FROM PUBLIC, "anon", "authenticated";

CREATE TRIGGER "reject_bulk_report_insert" AFTER INSERT ON "public"."reports" REFERENCING NEW TABLE AS "new_reports" FOR EACH STATEMENT EXECUTE FUNCTION "public"."reject_bulk_report_insert"();

-- Hand-added: how many existing rows the two NOT VALID checks would refuse.
-- Updates to such a row fail until it is fixed.
DO $$
DECLARE
  bad_images bigint;
  long_descriptions bigint;
BEGIN
  SELECT count(*) INTO bad_images FROM public.reports
  WHERE image IS NOT NULL
    AND NOT (image ~ '^public/[^/[:cntrl:]]+$' AND strpos(image, '..') = 0);
  SELECT count(*) INTO long_descriptions FROM public.reports
  WHERE char_length(description) > 1000;
  IF bad_images > 0 OR long_descriptions > 0 THEN
    RAISE WARNING 'reports: % row(s) break reports_image_path and % break reports_description_length. They are left as they are (NOT VALID), but updating them will fail until fixed.',
      bad_images, long_descriptions;
  END IF;
END
$$;

ALTER TABLE "public"."reports"
    ADD CONSTRAINT "reports_lat_range" CHECK ((("lat" >= ('-90'::integer)::double precision) AND ("lat" <= (90)::double precision)));

ALTER TABLE "public"."reports"
    ADD CONSTRAINT "reports_long_range" CHECK ((("long" >= ('-180'::integer)::double precision) AND ("long" <= (180)::double precision)));

ALTER TABLE "public"."reports"
    ADD CONSTRAINT "reports_image_path" CHECK ((("image" IS NULL) OR (("image" ~ '^public/[^/[:cntrl:]]+$'::"text") AND ("strpos"("image", '..'::"text") = 0)))) NOT VALID;

ALTER TABLE "public"."reports"
    ADD CONSTRAINT "reports_description_length" CHECK (("char_length"(("description")::"text") <= 1000)) NOT VALID;


-- 4. Report photo uploads -------------------------------------------------------

CREATE OR REPLACE FUNCTION "private"."can_upload_report_photo"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  caller uuid := auth.uid();
  day_max integer := CASE WHEN private.current_agency_id() IS NULL THEN 10 ELSE 100 END;
BEGIN
  IF caller IS NULL THEN
    RETURN false;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('report_photo:' || caller::text));
  RETURN (SELECT count(*) FROM storage.objects o
          WHERE o.bucket_id = 'ReportImage'
            AND o.owner_id = caller::text
            AND o.created_at > now() - interval '1 day') < day_max;
END;
$$;

ALTER FUNCTION "private"."can_upload_report_photo"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "private"."can_upload_report_photo"() FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "private"."can_upload_report_photo"() TO "authenticated";

-- storage.objects belongs to Supabase's storage role; postgres may drop and
-- create its policies but not alter them.
DROP POLICY "Signed-in users upload report photos under a random name" ON "storage"."objects";

CREATE POLICY "Signed-in users upload report photos under a random name" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'ReportImage'::"text") AND ("name" ~ '^public/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,5}$'::"text") AND ( SELECT "private"."can_upload_report_photo"() AS "can_upload_report_photo")));


-- 7. MAINTAIN -------------------------------------------------------------------

REVOKE MAINTAIN ON TABLE "public"."components" FROM "anon", "authenticated";
REVOKE MAINTAIN ON TABLE "public"."component_locations" FROM "anon", "authenticated";
REVOKE MAINTAIN ON TABLE "public"."flood_results" FROM "anon", "authenticated";
REVOKE MAINTAIN ON TABLE "public"."barangay_boundaries" FROM "anon", "authenticated";
REVOKE MAINTAIN ON TABLE "public"."maintenance" FROM "anon", "authenticated";


-- 8. Geocode trigger without an embedded key -------------------------------------

CREATE OR REPLACE FUNCTION "private"."request_geocode"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  worker_url text;
  worker_secret text;
BEGIN
  SELECT s.decrypted_secret INTO worker_url
  FROM vault.decrypted_secrets s WHERE s.name = 'geocode_worker_url';
  SELECT s.decrypted_secret INTO worker_secret
  FROM vault.decrypted_secrets s WHERE s.name = 'geocode_worker_secret';
  IF worker_url IS NULL OR worker_secret IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM net.http_post(
    url := worker_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-geocode-secret', worker_secret),
    timeout_milliseconds := 5000);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Geocoding was not requested: %', SQLERRM;
  RETURN NULL;
END;
$$;

ALTER FUNCTION "private"."request_geocode"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "private"."request_geocode"() FROM PUBLIC, "anon", "authenticated";

DROP TRIGGER "trigger-geocode-on-insert" ON "public"."reports";

CREATE TRIGGER "trigger-geocode-on-insert" AFTER INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "private"."request_geocode"();


-- Hand-added data step: bucket types on the hosted project (locally the
-- buckets are created from config.toml after migrations, so this updates
-- nothing there).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id IN ('ReportImage', 'Avatars');
