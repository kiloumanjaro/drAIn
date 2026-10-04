SET local check_function_bodies = off;

DROP POLICY "Anyone can read reports" ON "public"."reports";

DROP POLICY "Uploaders remove their own fresh unused report photo" ON "storage"."objects";

CREATE OR REPLACE FUNCTION private.report_photo_in_use (
  p_name text
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.reports r
                 WHERE r.image = p_name OR r.resolved_image = p_name)
      OR EXISTS (SELECT 1 FROM public.maintenance m WHERE m.evidence_image = p_name)
      OR EXISTS (SELECT 1 FROM public.maintenance_reviews v WHERE v.evidence_image = p_name);
END;
$function$;

CREATE OR REPLACE FUNCTION public.nearest_components (
  p_type        public.component_type,
  p_lat         double precision,
  p_lon         double precision,
  p_radius_m    double precision      DEFAULT 50,
  p_max_results integer               DEFAULT 3
)
  RETURNS TABLE (
    name     text,
    lat      double precision,
    long     double precision,
    distance double precision
  )
  LANGUAGE sql
  STABLE
  SET search_path TO 'public', 'extensions'
  AS $function$
  select c.name,
         st_y(c.location::geometry),
         st_x(c.location::geometry),
         st_distance(c.location, q.point)
  from public.components c,
       (select st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography as point) q
  where c.type = p_type
    and st_dwithin(c.location, q.point, least(greatest(p_radius_m, 0), 500))
  order by c.location <-> q.point
  limit least(greatest(p_max_results, 1), 20)
$function$;

CREATE POLICY "Anyone reads reports staff have not rejected" ON "public"."reports"
  FOR SELECT
  TO PUBLIC
  USING (((review_status <> 'rejected'::public.report_review) OR (( SELECT private.current_agency_id() AS current_agency_id) IS
    NOT NULL) OR (user_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "Uploaders remove their own fresh report photo nothing uses" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING
    (((bucket_id = 'ReportImage'::text) AND (owner_id = (( SELECT auth.uid() AS uid))::text) AND (created_at > (now() - '01:00:00'::interval)) AND (NOT ( SELECT
    private.report_photo_in_use(objects.name) AS report_photo_in_use))));

REVOKE ALL ON FUNCTION "private"."current_agency_id"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."current_agency_id"() FROM "anon";

GRANT EXECUTE ON FUNCTION "private"."current_agency_id"() TO "anon";

REVOKE ALL ON FUNCTION "private"."current_agency_id"() FROM "authenticated";

GRANT EXECUTE ON FUNCTION "private"."current_agency_id"() TO "authenticated";

REVOKE ALL ON FUNCTION "private"."current_agency_id"() FROM "service_role";

GRANT EXECUTE ON FUNCTION "private"."current_agency_id"() TO "service_role";

REVOKE ALL ON FUNCTION "private"."is_admin"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."is_admin"() FROM "service_role";

GRANT EXECUTE ON FUNCTION "private"."is_admin"() TO "service_role";

REVOKE ALL ON FUNCTION "private"."report_photo_in_use"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."report_photo_in_use"(text) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."report_photo_in_use"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."report_photo_in_use"(text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."nearest_components"(public.component_type, double precision, double precision, double precision, integer) FROM PUBLIC;
