-- Hand-edited: the generated REVOKE ALL would also remove anon's column-level
-- SELECT grants on reports. Only INSERT is taken away.
REVOKE INSERT ON TABLE "public"."reports" FROM "anon";

DROP POLICY "Anyone can file a pending report" ON "public"."reports";

DROP POLICY "Report photos under a random name" ON "storage"."objects";

CREATE POLICY "Signed-in users file pending reports" ON "public"."reports"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((status = 'pending'::public.report_status) AND (user_id = ( SELECT auth.uid() AS uid)) AND (resolved_by_maintenance_id IS NULL) AND (resolved_image IS NULL)));

CREATE POLICY "Signed-in users upload report photos under a random name" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'ReportImage'::text) AND (name ~ '^public/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,5}$'::text)));
