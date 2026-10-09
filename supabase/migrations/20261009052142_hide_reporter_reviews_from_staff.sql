DROP POLICY "Staff and the reviewer can read reviews" ON "public"."maintenance_reviews";

CREATE POLICY "Reviewers read their own reviews and staff read staff checks" ON "public"."maintenance_reviews"
  FOR SELECT
  TO "authenticated"
  USING (((reviewer_id = ( SELECT auth.uid() AS uid)) OR ((reviewer_kind = 'staff'::text) AND (( SELECT private.current_agency_id() AS current_agency_id) IS NOT NULL))));
