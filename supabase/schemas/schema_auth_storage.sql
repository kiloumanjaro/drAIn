-- Objects outside the public schema that the app depends on, copied from
-- the live project's auth and storage schemas on 2026-09-26. Loaded after
-- schema.sql (file names sort that way), because the trigger calls a public
-- function.

-- Every sign-up gets a profiles row. See public.handle_new_user in
-- schema.sql: it takes `role` from client-supplied metadata.
CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

-- Storage access. Buckets themselves are declared in supabase/config.toml.
-- Avatars: anyone reads; a signed-in user writes only under <their id>/.
CREATE POLICY "Allow authenticated users to upload their own avatars" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'Avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));
CREATE POLICY "Allow public read access to avatars" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'Avatars'::"text"));

-- ReportImage: anyone, signed in or not, reads, uploads and overwrites.
CREATE POLICY "Public insert access" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'ReportImage'::"text"));
CREATE POLICY "Public read access" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'ReportImage'::"text"));
CREATE POLICY "Public update access" ON "storage"."objects" FOR UPDATE USING (("bucket_id" = 'ReportImage'::"text")) WITH CHECK (("bucket_id" = 'ReportImage'::"text"));
