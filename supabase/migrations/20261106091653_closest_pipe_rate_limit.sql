SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.consume_rate_limit (
  p_bucket text
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  caller uuid := auth.uid();
  short_max integer;
  short_window interval;
  day_max integer;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Sign in first.' USING ERRCODE = '42501';
  END IF;

  CASE p_bucket
    WHEN 'chatbot' THEN
      short_max := 20; short_window := interval '10 minutes'; day_max := 100;
    WHEN 'join_agency' THEN
      short_max := 10; short_window := interval '1 hour'; day_max := 20;
    WHEN 'record_maintenance' THEN
      short_max := 30; short_window := interval '1 hour'; day_max := 200;
    WHEN 'review_report' THEN
      short_max := 120; short_window := interval '1 hour'; day_max := 500;
    WHEN 'review_maintenance' THEN
      short_max := 60; short_window := interval '1 hour'; day_max := 200;
    WHEN 'closest_pipe' THEN
      short_max := 60; short_window := interval '1 hour'; day_max := 300;
    ELSE
      RAISE EXCEPTION 'Unknown rate limit %.', p_bucket USING ERRCODE = '22023';
  END CASE;

  PERFORM pg_advisory_xact_lock(hashtext('rate_limit:' || p_bucket || ':' || caller::text));

  IF (SELECT count(*) FROM private.rate_limit_events
      WHERE bucket = p_bucket AND user_id = caller
        AND created_at > now() - short_window) >= short_max
     OR (SELECT count(*) FROM private.rate_limit_events
         WHERE bucket = p_bucket AND user_id = caller
           AND created_at > now() - interval '1 day') >= day_max THEN
    RETURN false;
  END IF;

  INSERT INTO private.rate_limit_events (bucket, user_id) VALUES (p_bucket, caller);
  DELETE FROM private.rate_limit_events WHERE created_at < now() - interval '1 day';
  RETURN true;
END;
$function$;
