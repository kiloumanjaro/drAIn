-- Objects outside the public schema that the app depends on, copied from
-- the live project's auth and storage schemas on 2026-09-26. Loaded after
-- schema.sql (file names sort that way), because the trigger calls a public
-- function.

-- Every sign-up gets a profiles row. See public.handle_new_user in
-- schema.sql: it takes `role` from client-supplied metadata.
CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

-- Storage access. Buckets themselves, with their size and type limits, are
-- declared in supabase/config.toml.
-- Avatars: anyone reads; a signed-in user writes and replaces files only
-- under <their id>/ (updateUserProfile uploads with upsert, which needs the
-- UPDATE policy to replace an existing avatar).
CREATE POLICY "Allow authenticated users to upload their own avatars" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'Avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));
CREATE POLICY "Allow authenticated users to replace their own avatars" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'Avatars'::"text") AND (( SELECT "auth"."uid"() AS "uid")::"text" = ("storage"."foldername"("name"))[1]))) WITH CHECK ((("bucket_id" = 'Avatars'::"text") AND (( SELECT "auth"."uid"() AS "uid")::"text" = ("storage"."foldername"("name"))[1])));
CREATE POLICY "Allow public read access to avatars" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'Avatars'::"text"));

-- The avatar flow removes the old upload after a failed profile save; without
-- a DELETE policy that remove was a silent no-op.
CREATE POLICY "Users remove their own avatars" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'Avatars'::"text") AND ((( SELECT "auth"."uid"() AS "uid"))::"text" = ("storage"."foldername"("name"))[1])));

-- ReportImage: anyone reads; only signed-in users upload. Signed-out uploads
-- were allowed until 2026-09-29, and nothing limited them: the photo is
-- uploaded before the report, so the report limits never applied. Nobody
-- overwrites: uploads get a fresh random name (uploadReport, maintenance
-- evidence), so there is never a reason to replace someone else's photo.
-- Uploads must be named public/<uuid>.<ext>, the only names the app makes,
-- so the bucket can't be used to host files under chosen names. Size (10
-- MiB) and type (JPEG, PNG, WebP, HEIC/HEIF) are limited on the bucket, in
-- config.toml (and on the hosted bucket by migration 20260930120000).
-- Each person may upload a limited number a day (can_upload_report_photo):
-- the photo is uploaded before its report, so the report limits alone never
-- stopped someone filling the bucket.

-- True while the signed-in caller has uploaded fewer than their daily
-- allowance of report photos: 10 in 24 hours for citizens (the 10 reports
-- a day check_report_submission allows), 100
-- for agency staff, who also upload maintenance evidence here. Counts
-- storage.objects by owner_id, which the Storage API sets from the caller's
-- token. The advisory lock makes concurrent uploads take turns.
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

CREATE POLICY "Signed-in users upload report photos under a random name" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'ReportImage'::"text") AND ("name" ~ '^public/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,5}$'::"text") AND ( SELECT "private"."can_upload_report_photo"() AS "can_upload_report_photo")));
CREATE POLICY "Anyone can view report photos" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'ReportImage'::"text"));

-- Cleanup of a photo whose report was refused: the owner may delete their own
-- fresh upload while nothing references it (reports.image,
-- reports.resolved_image, maintenance.evidence_image). The 1-hour window
-- keeps the policy to its purpose; it is not an "undo" for published photos.
-- Deleting restores the uploader's daily allowance, which
-- can_upload_report_photo counts from storage.objects.
CREATE POLICY "Uploaders remove their own fresh unused report photo" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'ReportImage'::"text") AND ("owner_id" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("created_at" > ("now"() - '01:00:00'::interval)) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."reports" "r"
  WHERE (("r"."image" = "objects"."name") OR ("r"."resolved_image" = "objects"."name"))))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."maintenance" "m"
  WHERE ("m"."evidence_image" = "objects"."name"))))));
