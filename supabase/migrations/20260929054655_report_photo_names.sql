DROP POLICY "Public insert access" ON "storage"."objects";

CREATE POLICY "Report photos under a random name" ON "storage"."objects"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((bucket_id = 'ReportImage'::text) AND (name ~ '^public/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,5}$'::text)));
