SET local check_function_bodies = off;

REVOKE ALL ON TABLE "public"."maintenance" FROM "authenticated";

REVOKE ALL ("photo_distance_m") ON TABLE "public"."reports" FROM "anon";

REVOKE ALL ("photo_taken_at") ON TABLE "public"."reports" FROM "anon";

REVOKE ALL ("photo_distance_m") ON TABLE "public"."reports" FROM "authenticated";

REVOKE ALL ("photo_taken_at") ON TABLE "public"."reports" FROM "authenticated";

DROP VIEW "public"."latest_report_per_component";

DROP FUNCTION "public"."report_private_details"(uuid);

CREATE OR REPLACE FUNCTION public.report_private_details (
  p_report_ids uuid[]
)
  RETURNS TABLE (
    id               uuid,
    is_mine          boolean,
    photo_lat        double precision,
    photo_lon        double precision,
    photo_taken_at   timestamp with time zone,
    photo_distance_m double precision,
    reviewed_by      uuid
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  IF cardinality(p_report_ids) > 100 THEN
    RAISE EXCEPTION 'Ask for at most 100 reports at a time.' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    SELECT r.id, r.user_id IS NOT DISTINCT FROM auth.uid() AND auth.uid() IS NOT NULL,
           r.photo_lat, r.photo_lon, r.photo_taken_at, r.photo_distance_m, r.reviewed_by
    FROM public.reports r
    WHERE r.id = ANY (p_report_ids)
      AND (r.user_id = (SELECT auth.uid())
           OR (SELECT private.current_agency_id()) IS NOT NULL);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."report_private_details"(uuid[]) FROM PUBLIC, "anon";

CREATE VIEW "public"."latest_report_per_component" WITH (security_invoker=true) AS  SELECT DISTINCT ON (component_id) id,
    created_at,
    category,
    description,
    image,
    reporter_name,
    status,
    component_id,
    long,
    lat,
    geocoded_status,
    address,
    priority,
    zone,
    resolved_by_maintenance_id,
    resolved_image,
    resolved_at,
    reviewed_at,
    review_note,
    photo_check,
    review_status
   FROM public.reports
  WHERE ((component_id IS NOT NULL) AND (review_status <> 'rejected'::public.report_review))
  ORDER BY component_id, created_at DESC;

GRANT EXECUTE ON FUNCTION "public"."report_private_details"(uuid[]) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."report_private_details"(uuid[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."report_private_details"(uuid[]) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."report_private_details"(uuid[]) TO "service_role";

REVOKE ALL ("agency_id") ON TABLE "public"."maintenance" FROM "authenticated";

GRANT SELECT ("agency_id") ON TABLE "public"."maintenance" TO "authenticated";

REVOKE ALL ("component_name") ON TABLE "public"."maintenance" FROM "authenticated";

GRANT SELECT ("component_name") ON TABLE "public"."maintenance" TO "authenticated";

REVOKE ALL ("component_type") ON TABLE "public"."maintenance" FROM "authenticated";

GRANT SELECT ("component_type") ON TABLE "public"."maintenance" TO "authenticated";

REVOKE ALL ("created_at") ON TABLE "public"."maintenance" FROM "authenticated";

GRANT SELECT ("created_at") ON TABLE "public"."maintenance" TO "authenticated";

REVOKE ALL ("description") ON TABLE "public"."maintenance" FROM "authenticated";

GRANT SELECT ("description") ON TABLE "public"."maintenance" TO "authenticated";

REVOKE ALL ("evidence_image") ON TABLE "public"."maintenance" FROM "authenticated";

GRANT SELECT ("evidence_image") ON TABLE "public"."maintenance" TO "authenticated";

REVOKE ALL ("id") ON TABLE "public"."maintenance" FROM "authenticated";

GRANT SELECT ("id") ON TABLE "public"."maintenance" TO "authenticated";

REVOKE ALL ("performed_at") ON TABLE "public"."maintenance" FROM "authenticated";

GRANT SELECT ("performed_at") ON TABLE "public"."maintenance" TO "authenticated";

REVOKE ALL ("status") ON TABLE "public"."maintenance" FROM "authenticated";

GRANT SELECT ("status") ON TABLE "public"."maintenance" TO "authenticated";

REVOKE ALL ("verification_status") ON TABLE "public"."maintenance" FROM "authenticated";

GRANT SELECT ("verification_status") ON TABLE "public"."maintenance" TO "authenticated";

REVOKE ALL ON TABLE "public"."latest_report_per_component" FROM "anon";

GRANT SELECT ON TABLE "public"."latest_report_per_component" TO "anon";

REVOKE ALL ON TABLE "public"."latest_report_per_component" FROM "authenticated";

GRANT SELECT ON TABLE "public"."latest_report_per_component" TO "authenticated";

REVOKE ALL ON TABLE "public"."latest_report_per_component" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."latest_report_per_component" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."latest_report_per_component" TO "service_role";
