-- Hand-edited: declarative sync wrote each rename as DROP POLICY + CREATE
-- POLICY. A rename changes nothing else, so it is done as one.
ALTER POLICY "Allow individual insert access" ON "public"."profiles" RENAME TO "People create their own profile";
ALTER POLICY "Allow individual read access" ON "public"."profiles" RENAME TO "People read their own profile";
ALTER POLICY "Allow individual update access" ON "public"."profiles" RENAME TO "People edit their own profile";
ALTER POLICY "Enable read access for all users" ON "public"."agencies" RENAME TO "Anyone can read agencies";
ALTER POLICY "Public insert reports" ON "public"."reports" RENAME TO "Anyone can file a pending report";
ALTER POLICY "Public select reports" ON "public"."reports" RENAME TO "Anyone can read reports";
ALTER POLICY "Enable read access for all users" ON "public"."components" RENAME TO "Anyone can read components";
ALTER POLICY "Enable read access for all users" ON "public"."flood_results" RENAME TO "Anyone can read flood results";
ALTER POLICY "Enable read access for all users" ON "public"."barangay_boundaries" RENAME TO "Anyone can read barangays";
ALTER POLICY "Enable read access for all users" ON "public"."maintenance" RENAME TO "Anyone can read maintenance";
-- storage.objects belongs to Supabase's storage role, and only an owner may
-- rename a policy; dropping and creating one is allowed.
DROP POLICY "Public read access" ON "storage"."objects";
CREATE POLICY "Anyone can view report photos" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'ReportImage'::"text"));
