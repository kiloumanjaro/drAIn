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

-- ReportImage: anyone, signed in or not, reads and uploads. Nobody
-- overwrites: uploads get a fresh random name (uploadReport, maintenance
-- evidence), so there is never a reason to replace someone else's photo.
-- Uploads must be named public/<uuid>.<ext>, the only names the app makes,
-- so the bucket can't be used to host files under chosen names. Size (10
-- MiB) and type (images) are limited on the bucket, in config.toml.
CREATE POLICY "Report photos under a random name" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'ReportImage'::"text") AND ("name" ~ '^public/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,5}$'::"text")));
CREATE POLICY "Public read access" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'ReportImage'::"text"));
