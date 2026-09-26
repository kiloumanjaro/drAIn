SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE INDEX idx_profiles_agency_id ON public.profiles USING btree (agency_id);

CREATE INDEX idx_reports_user_id ON public.reports USING btree (user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON COLUMN "public"."reports"."zone" IS 'The barangay containing the report''s coordinates, set by update_report_zone from barangay_boundaries ("Outside Mandaue" if none). Matches the barangay names in the map GeoJSON.';

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
