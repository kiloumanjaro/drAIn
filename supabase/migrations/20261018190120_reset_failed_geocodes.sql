SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.reset_failed_geocodes()
  RETURNS integer
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  WITH reset AS (
    UPDATE public.reports
    SET geocoded_status = 'pending'
    WHERE geocoded_status = 'failed' AND lat IS NOT NULL AND long IS NOT NULL
    RETURNING 1
  )
  SELECT count(*)::integer FROM reset;
$function$;

REVOKE ALL ON FUNCTION "private"."reset_failed_geocodes"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."reset_failed_geocodes"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."reset_failed_geocodes"() TO "postgres";
