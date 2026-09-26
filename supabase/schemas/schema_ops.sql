-- Guards for the app's expensive services.
--
-- The chatbot calls a paid model on every message, so each signed-in user
-- gets a fixed allowance. The limits live here, not in the API route, so a
-- serverless function with no memory between requests can still enforce
-- them, and a caller can't choose their own.
--
-- Builds on schema.sql (the private schema).


-- One row per allowed request, per user and bucket. Pruned to a day.
CREATE TABLE IF NOT EXISTS "private"."rate_limit_events" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "bucket" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id")
);


ALTER TABLE "private"."rate_limit_events" OWNER TO "postgres";


ALTER TABLE "private"."rate_limit_events" ENABLE ROW LEVEL SECURITY;


CREATE INDEX "idx_rate_limit_events_lookup" ON "private"."rate_limit_events" USING "btree" ("bucket", "user_id", "created_at" DESC);


CREATE INDEX "idx_rate_limit_events_created_at" ON "private"."rate_limit_events" USING "btree" ("created_at");


-- Takes one request from the signed-in caller's allowance for a named
-- service. True if allowed (and counted), false if the allowance is used
-- up. Limits per bucket:
--   chatbot: 20 in 10 minutes, 100 in a day.
-- An unknown bucket is an error, so a typo can't mean "unlimited".
CREATE OR REPLACE FUNCTION "public"."consume_rate_limit"("p_bucket" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."consume_rate_limit"("p_bucket" "text") OWNER TO "postgres";


REVOKE ALL ON FUNCTION "public"."consume_rate_limit"("p_bucket" "text") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."consume_rate_limit"("p_bucket" "text") TO "authenticated", "service_role";
