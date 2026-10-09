SET local check_function_bodies = off;

DROP POLICY "Allow authenticated users to replace their own avatars" ON "storage"."objects";

DROP POLICY "Allow authenticated users to upload their own avatars" ON "storage"."objects";

DROP POLICY "Allow public read access to avatars" ON "storage"."objects";

DROP POLICY "Anyone can view report photos" ON "storage"."objects";

DROP POLICY "Signed-in users upload report photos under a random name" ON "storage"."objects";

CREATE OR REPLACE FUNCTION private.owns_report_photo (
  p_name text
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN p_name ~ '^public/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
     AND EXISTS (SELECT 1 FROM storage.objects o
                 WHERE o.bucket_id = 'ReportImage'
                   AND o.name = p_name
                   AND o.owner_id = (SELECT auth.uid())::text);
END;
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
  per_day integer := 10;
  component record;
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
    IF NEW.image IS NOT NULL AND NOT private.owns_report_photo(NEW.image) THEN
      RAISE EXCEPTION 'The photo must be uploaded through the app.' USING ERRCODE = '22023';
    END IF;
    IF NEW.component_id IS NULL THEN
      RAISE EXCEPTION 'Say which inlet, outlet, pipe or storm drain the report is about.'
        USING ERRCODE = '22023';
    END IF;
    SELECT c.type,
           extensions.st_y(c.location::extensions.geometry) AS lat,
           extensions.st_x(c.location::extensions.geometry) AS long
    INTO component
    FROM public.components c
    WHERE c.name = NEW.component_id;
    -- An unknown component is left for the foreign key to refuse.
    IF FOUND THEN
      NEW.category := component.type;
      NEW.lat := component.lat;
      NEW.long := component.long;
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
$function$;

CREATE POLICY "Signed-in users upload report photos as a randomly named JPEG" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH
    CHECK
    (((bucket_id = 'ReportImage'::text) AND (name ~ '^public/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'::text) AND ( SELECT
    private.can_upload_report_photo() AS can_upload_report_photo)));

CREATE POLICY "Uploaders see their own report photos" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'ReportImage'::text) AND (owner_id = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "Users replace their own avatar" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'Avatars'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1])))
  WITH CHECK (((bucket_id = 'Avatars'::text) AND (name = ((( SELECT auth.uid() AS uid))::text || '/avatar.jpg'::text))));

CREATE POLICY "Users see their own avatar files" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'Avatars'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1])));

CREATE POLICY "Users upload their own avatar" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'Avatars'::text) AND (name = ((( SELECT auth.uid() AS uid))::text || '/avatar.jpg'::text))));

REVOKE ALL ON FUNCTION "private"."owns_report_photo"(text) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."owns_report_photo"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."owns_report_photo"(text) TO "postgres";

-- Hand-edited: data step for the hosted buckets, which the diff can't see
-- (locally the buckets are created from config.toml after migrations, so
-- this updates nothing there). Migration 20260930120000 set the types but
-- not the size limits its comments claimed.
UPDATE storage.buckets
SET file_size_limit = 10485760, allowed_mime_types = ARRAY['image/jpeg']
WHERE id = 'ReportImage';

UPDATE storage.buckets
SET file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg']
WHERE id = 'Avatars';
