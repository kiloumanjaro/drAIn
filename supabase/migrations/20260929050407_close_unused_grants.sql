SET local check_function_bodies = off;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."protect_profile_privileges"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."protect_profile_privileges"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."set_reporter_name"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."set_reporter_name"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."sync_reporter_name"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."sync_reporter_name"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."update_report_zone"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."update_report_zone"() FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."inlets_gid_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."inlets_gid_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."man_pipes_gid_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."man_pipes_gid_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."outlets_gid_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."outlets_gid_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."storm_drains_gid_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."storm_drains_gid_seq" FROM "authenticated";

REVOKE ALL ON TABLE "public"."geocode_worker_lock" FROM "anon";

REVOKE ALL ON TABLE "public"."geocode_worker_lock" FROM "authenticated";

DROP FUNCTION "public"."extract_barangay_from_coordinates"(double precision, double precision);

CREATE OR REPLACE FUNCTION private.extract_barangay_from_coordinates (
  longitude double precision,
  latitude  double precision
)
  RETURNS character varying
  LANGUAGE plpgsql
  STABLE
  SET search_path TO 'public', 'extensions'
  AS $function$
DECLARE
  matched_barangay VARCHAR(255);
BEGIN
  -- Validate inputs
  IF longitude IS NULL OR latitude IS NULL THEN
    RETURN NULL;
  END IF;

  -- Find which barangay polygon contains this point
  -- Using ST_Contains with geometry casting for efficient spatial queries
  SELECT name INTO matched_barangay
  FROM barangay_boundaries
  WHERE ST_Contains(
    boundary::geometry,
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geometry
  )
  LIMIT 1;

  -- If no barangay found, return "Outside Mandaue" catch-all
  IF matched_barangay IS NULL THEN
    RETURN 'Outside Mandaue';
  END IF;

  RETURN matched_barangay;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_report_zone()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  -- Extract zone from coordinates (not address)
  IF NEW.long IS NOT NULL AND NEW.lat IS NOT NULL THEN
    NEW.zone := private.extract_barangay_from_coordinates(NEW.long, NEW.lat);
  ELSE
    NEW.zone := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION "private"."extract_barangay_from_coordinates"(double precision, double precision) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."extract_barangay_from_coordinates"(double precision, double precision) TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "private"."refresh_verification"(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."reopen_resolved_reports"(uuid, uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."reporter_key"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."request_ip"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."dashboard_overview"(timestamp WITH time zone) FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."protect_profile_privileges"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."repair_trend"(integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."set_reporter_name"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."sync_reporter_name"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."update_report_zone"() FROM PUBLIC;

REVOKE ALL ON TABLE "public"."agencies" FROM "anon";

GRANT SELECT ON TABLE "public"."agencies" TO "anon";

REVOKE ALL ON TABLE "public"."agencies" FROM "authenticated";

GRANT SELECT ON TABLE "public"."agencies" TO "authenticated";

REVOKE ALL ON TABLE "public"."barangay_boundaries" FROM "anon";

GRANT MAINTAIN, SELECT ON TABLE "public"."barangay_boundaries" TO "anon";

REVOKE ALL ON TABLE "public"."barangay_boundaries" FROM "authenticated";

GRANT MAINTAIN, SELECT ON TABLE "public"."barangay_boundaries" TO "authenticated";

REVOKE ALL ON TABLE "public"."components" FROM "anon";

GRANT MAINTAIN, SELECT ON TABLE "public"."components" TO "anon";

REVOKE ALL ON TABLE "public"."components" FROM "authenticated";

GRANT MAINTAIN, SELECT ON TABLE "public"."components" TO "authenticated";

REVOKE ALL ON TABLE "public"."flood_results" FROM "anon";

GRANT MAINTAIN, SELECT ON TABLE "public"."flood_results" TO "anon";

REVOKE ALL ON TABLE "public"."flood_results" FROM "authenticated";

GRANT MAINTAIN, SELECT ON TABLE "public"."flood_results" TO "authenticated";

REVOKE ALL ON TABLE "public"."inlets" FROM "anon";

GRANT SELECT ON TABLE "public"."inlets" TO "anon";

REVOKE ALL ON TABLE "public"."inlets" FROM "authenticated";

GRANT SELECT ON TABLE "public"."inlets" TO "authenticated";

REVOKE ALL ON TABLE "public"."maintenance" FROM "anon";

GRANT MAINTAIN, SELECT ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ON TABLE "public"."maintenance" FROM "authenticated";

GRANT MAINTAIN, SELECT ON TABLE "public"."maintenance" TO "authenticated";

REVOKE ALL ON TABLE "public"."maintenance_reviews" FROM "authenticated";

GRANT SELECT ON TABLE "public"."maintenance_reviews" TO "authenticated";

REVOKE ALL ON TABLE "public"."man_pipes" FROM "anon";

GRANT SELECT ON TABLE "public"."man_pipes" TO "anon";

REVOKE ALL ON TABLE "public"."man_pipes" FROM "authenticated";

GRANT SELECT ON TABLE "public"."man_pipes" TO "authenticated";

REVOKE ALL ON TABLE "public"."outlets" FROM "anon";

GRANT SELECT ON TABLE "public"."outlets" TO "anon";

REVOKE ALL ON TABLE "public"."outlets" FROM "authenticated";

GRANT SELECT ON TABLE "public"."outlets" TO "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "anon";

GRANT SELECT ON TABLE "public"."profiles" TO "anon";

REVOKE ALL ON TABLE "public"."profiles" FROM "authenticated";

GRANT INSERT, SELECT, UPDATE ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ON TABLE "public"."reports" FROM "anon";

GRANT INSERT, SELECT ON TABLE "public"."reports" TO "anon";

REVOKE ALL ON TABLE "public"."reports" FROM "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."reports" TO "authenticated";

REVOKE ALL ON TABLE "public"."simulation_runs" FROM "authenticated";

GRANT SELECT ON TABLE "public"."simulation_runs" TO "authenticated";

REVOKE ALL ON TABLE "public"."storm_drains" FROM "anon";

GRANT SELECT ON TABLE "public"."storm_drains" TO "anon";

REVOKE ALL ON TABLE "public"."storm_drains" FROM "authenticated";

GRANT SELECT ON TABLE "public"."storm_drains" TO "authenticated";

REVOKE ALL ON TABLE "public"."component_locations" FROM "anon";

GRANT MAINTAIN, SELECT ON TABLE "public"."component_locations" TO "anon";

REVOKE ALL ON TABLE "public"."component_locations" FROM "authenticated";

GRANT MAINTAIN, SELECT ON TABLE "public"."component_locations" TO "authenticated";

REVOKE ALL ON TABLE "public"."latest_report_per_component" FROM "anon";

GRANT SELECT ON TABLE "public"."latest_report_per_component" TO "anon";

REVOKE ALL ON TABLE "public"."latest_report_per_component" FROM "authenticated";

GRANT SELECT ON TABLE "public"."latest_report_per_component" TO "authenticated";

REVOKE ALL ON TABLE "public"."repair_time_by_component" FROM "anon";

GRANT SELECT ON TABLE "public"."repair_time_by_component" TO "anon";

REVOKE ALL ON TABLE "public"."repair_time_by_component" FROM "authenticated";

GRANT SELECT ON TABLE "public"."repair_time_by_component" TO "authenticated";

REVOKE ALL ON TABLE "public"."report_counts_by_category" FROM "anon";

GRANT SELECT ON TABLE "public"."report_counts_by_category" TO "anon";

REVOKE ALL ON TABLE "public"."report_counts_by_category" FROM "authenticated";

GRANT SELECT ON TABLE "public"."report_counts_by_category" TO "authenticated";

REVOKE ALL ON TABLE "public"."report_counts_by_component" FROM "anon";

GRANT SELECT ON TABLE "public"."report_counts_by_component" TO "anon";

REVOKE ALL ON TABLE "public"."report_counts_by_component" FROM "authenticated";

GRANT SELECT ON TABLE "public"."report_counts_by_component" TO "authenticated";

REVOKE ALL ON TABLE "public"."report_counts_by_zone" FROM "anon";

GRANT SELECT ON TABLE "public"."report_counts_by_zone" TO "anon";

REVOKE ALL ON TABLE "public"."report_counts_by_zone" FROM "authenticated";

GRANT SELECT ON TABLE "public"."report_counts_by_zone" TO "authenticated";

REVOKE ALL ON TABLE "public"."report_repair_days" FROM "anon";

GRANT SELECT ON TABLE "public"."report_repair_days" TO "anon";

REVOKE ALL ON TABLE "public"."report_repair_days" FROM "authenticated";

GRANT SELECT ON TABLE "public"."report_repair_days" TO "authenticated";

REVOKE ALL ON TABLE "public"."team_performance" FROM "anon";

GRANT SELECT ON TABLE "public"."team_performance" TO "anon";

REVOKE ALL ON TABLE "public"."team_performance" FROM "authenticated";

GRANT SELECT ON TABLE "public"."team_performance" TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" REVOKE ALL ON FUNCTIONS FROM PUBLIC;
