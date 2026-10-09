-- Objects outside the public schema that the app depends on, copied from
-- the live project's auth and storage schemas on 2026-09-26. Loaded after
-- schema.sql (file names sort that way), because the trigger calls a public
-- function.

-- Every sign-up gets a profiles row. See public.handle_new_user in
-- schema.sql: always a citizen, whatever the client's metadata says.
CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

-- Storage access. Buckets themselves, with their size and type limits, are
-- declared in supabase/config.toml (and set on the hosted buckets by a data
-- step in migration photo_storage_rules).
--
-- Both buckets are public: anyone with a file's URL can fetch it, which is
-- how the app shows photos, and that does not pass through these policies.
-- The SELECT policies only govern the Storage API's own reads (list, and the
-- look-up it does before a replace or a remove), so each person sees their
-- own files and nobody can list a bucket. (Until 2026-10-04 anyone could
-- list both, which gave away every photo's random name and, from the avatar
-- folders, every user's id.)
--
-- Avatars: a signed-in user keeps one file, <their id>/avatar.jpg, the only
-- name the app writes (updateUserProfile uploads with upsert, which needs
-- the UPDATE policy to replace it). One fixed name means one file each, so
-- the bucket can't be filled.
CREATE POLICY "Users upload their own avatar" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'Avatars'::"text") AND ("name" = ((( SELECT "auth"."uid"() AS "uid"))::"text" || '/avatar.jpg'::"text"))));
CREATE POLICY "Users replace their own avatar" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'Avatars'::"text") AND (( SELECT "auth"."uid"() AS "uid")::"text" = ("storage"."foldername"("name"))[1]))) WITH CHECK ((("bucket_id" = 'Avatars'::"text") AND ("name" = ((( SELECT "auth"."uid"() AS "uid"))::"text" || '/avatar.jpg'::"text"))));
CREATE POLICY "Users see their own avatar files" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'Avatars'::"text") AND (( SELECT "auth"."uid"() AS "uid")::"text" = ("storage"."foldername"("name"))[1])));

-- The avatar flow removes the old upload after a failed profile save; without
-- a DELETE policy that remove was a silent no-op. By folder, so files left
-- from before the single-name rule can still be removed.
CREATE POLICY "Users remove their own avatars" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'Avatars'::"text") AND ((( SELECT "auth"."uid"() AS "uid"))::"text" = ("storage"."foldername"("name"))[1])));

-- ReportImage: only signed-in users upload. Signed-out uploads were allowed
-- until 2026-09-29, and nothing limited them: the photo is uploaded before
-- the report, so the report limits never applied. Nobody overwrites: uploads
-- get a fresh random name (uploadReport, maintenance evidence), so there is
-- never a reason to replace someone else's photo.
-- Uploads must be named public/<uuid>.jpg, the only names the app makes: it
-- re-encodes every photo to a JPEG with no metadata before uploading
-- (lib/reports/sanitize-image.ts). So the bucket can't be used to host files
-- under chosen names or as .html or .svg. Size (10 MiB) and type (JPEG) are
-- limited on the bucket. The app has no server-side upload, so a caller who
-- bypasses it can still publish a JPEG of their own with its metadata in.
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

CREATE POLICY "Signed-in users upload report photos as a randomly named JPEG" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'ReportImage'::"text") AND ("name" ~ '^public/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'::"text") AND ( SELECT "private"."can_upload_report_photo"() AS "can_upload_report_photo")));
CREATE POLICY "Uploaders see their own report photos" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'ReportImage'::"text") AND ("owner_id" = (( SELECT "auth"."uid"() AS "uid"))::"text")));

-- True if the name is a report photo the signed-in caller uploaded: the
-- app's naming, and an object in the bucket that the Storage API recorded
-- as theirs. Reports and maintenance records may only point at such a photo,
-- so nobody can attach someone else's picture, or reserve a name and put a
-- picture under it after staff have confirmed the report. Only reached from
-- SECURITY DEFINER functions.
CREATE OR REPLACE FUNCTION "private"."owns_report_photo"("p_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN p_name ~ '^public/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
     AND EXISTS (SELECT 1 FROM storage.objects o
                 WHERE o.bucket_id = 'ReportImage'
                   AND o.name = p_name
                   AND o.owner_id = (SELECT auth.uid())::text);
END;
$$;

ALTER FUNCTION "private"."owns_report_photo"("p_name" "text") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "private"."owns_report_photo"("p_name" "text") FROM PUBLIC, "anon", "authenticated";

-- True if a report, a maintenance record or a review of one points at this
-- photo. SECURITY DEFINER so the delete policy below sees every reference,
-- not only the rows the caller may read (a rejected report is hidden from
-- most people, and its photo must still not be deletable).
CREATE OR REPLACE FUNCTION "private"."report_photo_in_use"("p_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.reports r
                 WHERE r.image = p_name OR r.resolved_image = p_name)
      OR EXISTS (SELECT 1 FROM public.maintenance m WHERE m.evidence_image = p_name)
      OR EXISTS (SELECT 1 FROM public.maintenance_reviews v WHERE v.evidence_image = p_name);
END;
$$;

ALTER FUNCTION "private"."report_photo_in_use"("p_name" "text") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "private"."report_photo_in_use"("p_name" "text") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "private"."report_photo_in_use"("p_name" "text") TO "authenticated";

-- Cleanup of a photo whose report was refused: the owner may delete their own
-- fresh upload while nothing references it (report_photo_in_use). The 1-hour
-- window keeps the policy to its purpose; it is not an "undo" for published
-- photos. Deleting restores the uploader's daily allowance, which
-- can_upload_report_photo counts from storage.objects.
CREATE POLICY "Uploaders remove their own fresh report photo nothing uses" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'ReportImage'::"text") AND ("owner_id" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("created_at" > ("now"() - '01:00:00'::interval)) AND (NOT ( SELECT "private"."report_photo_in_use"("objects"."name") AS "report_photo_in_use"))));
