SET local check_function_bodies = off;

CREATE TABLE "private"."rate_limit_events" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "bucket"     text                     NOT NULL,
  "user_id"    uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "private"."rate_limit_events"
  ENABLE ROW LEVEL SECURITY;

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
    ELSE
      RAISE EXCEPTION 'Unknown rate limit %.', p_bucket USING ERRCODE = '22023';
  END CASE;

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

REVOKE ALL ON FUNCTION "public"."consume_rate_limit"(text) FROM PUBLIC, "anon";

CREATE INDEX idx_rate_limit_events_created_at ON private.rate_limit_events USING btree (created_at);

CREATE INDEX idx_rate_limit_events_lookup ON private.rate_limit_events USING btree (bucket, user_id, created_at DESC);

GRANT EXECUTE ON FUNCTION "public"."consume_rate_limit"(text) TO "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "private"."rate_limit_events" TO "postgres";
