SET local check_function_bodies = off;

REVOKE ALL ON SEQUENCE "public"."barangay_boundaries_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."barangay_boundaries_id_seq" FROM "authenticated";

DROP POLICY "Enable read access for all users" ON "public"."reports";

DROP POLICY "Public insert reports" ON "public"."reports";

DROP POLICY "Public update reports" ON "public"."reports";

DROP POLICY "Public update access" ON "storage"."objects";

ALTER TABLE "public"."report_comments"
  DROP CONSTRAINT "report_comments_report_id_fkey";

ALTER TABLE "public"."report_comments"
  DROP CONSTRAINT "report_comments_user_id_fkey";

ALTER TABLE "public"."reports"
  DROP CONSTRAINT "reports_user_id_fkey";

DROP FUNCTION "public"."extract_barangay_from_address"(text);

DROP TABLE "public"."report_comments";

ALTER TABLE "public"."barangay_boundaries"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.extract_barangay_from_coordinates (
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

CREATE OR REPLACE FUNCTION public.get_closest_inlet (
  input_lat double precision,
  input_lon double precision
)
  RETURNS TABLE (
    name     character varying,
    lat      double precision,
    long     double precision,
    distance double precision
  )
  LANGUAGE plpgsql
  SET search_path TO 'public', 'extensions'
  AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        i.name,
        ST_Y(ST_Centroid(i.geom)) AS lat,
        ST_X(ST_Centroid(i.geom)) AS long,
        ST_Distance(
            ST_Centroid(i.geom)::geography,
            ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography
        ) AS distance
    FROM inlets i
    WHERE 
        ST_DWithin(
        ST_Centroid(i.geom)::geography,
        ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography,
        50)
    ORDER BY ST_Centroid(i.geom)::geography <-> ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography
    LIMIT 3;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_closest_man_pipe (
  input_lat double precision,
  input_lon double precision
)
  RETURNS TABLE (
    name     character varying,
    lat      double precision,
    long     double precision,
    distance double precision
  )
  LANGUAGE plpgsql
  SET search_path TO 'public', 'extensions'
  AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        i.name,
        ST_Y(ST_Centroid(i.geom)) AS lat,
        ST_X(ST_Centroid(i.geom)) AS long,
        ST_Distance(
            ST_Centroid(i.geom)::geography,
            ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography
        ) AS distance
    FROM man_pipes i
    WHERE 
        ST_DWithin(
        ST_Centroid(i.geom)::geography,
        ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography,
        50)
    ORDER BY ST_Centroid(i.geom)::geography <-> ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography
    LIMIT 3;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_closest_outlet (
  input_lat double precision,
  input_lon double precision
)
  RETURNS TABLE (
    name     character varying,
    lat      double precision,
    long     double precision,
    distance double precision
  )
  LANGUAGE plpgsql
  SET search_path TO 'public', 'extensions'
  AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        i.name,
        ST_Y(ST_Centroid(i.geom)) AS lat,
        ST_X(ST_Centroid(i.geom)) AS long,
        ST_Distance(
            ST_Centroid(i.geom)::geography,
            ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography
        ) AS distance
    FROM outlets i
    WHERE 
        ST_DWithin(
        ST_Centroid(i.geom)::geography,
        ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography,
        50)
    ORDER BY ST_Centroid(i.geom)::geography <-> ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography
    LIMIT 3;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_closest_storm_drain (
  input_lat double precision,
  input_lon double precision
)
  RETURNS TABLE (
    name     character varying,
    lat      double precision,
    long     double precision,
    distance double precision
  )
  LANGUAGE plpgsql
  SET search_path TO 'public', 'extensions'
  AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        i.name,
        ST_Y(ST_Centroid(i.geom)) AS lat,
        ST_X(ST_Centroid(i.geom)) AS long,
        ST_Distance(
            ST_Centroid(i.geom)::geography,
            ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography
        ) AS distance
    FROM storm_drains i
    WHERE 
        ST_DWithin(
        ST_Centroid(i.geom)::geography,
        ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography,
        50)
    ORDER BY ST_Centroid(i.geom)::geography <-> ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geography
    LIMIT 3;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_component_by_category (
  category_name text
)
  RETURNS TABLE (
    name character varying,
    lat  double precision,
    long double precision
  )
  LANGUAGE plpgsql
  SET search_path TO 'public', 'extensions'
  AS $function$
BEGIN
    IF category_name NOT IN ('inlets', 'outlets', 'storm_drains', 'man_pipes') THEN
        RAISE EXCEPTION 'Unknown component category: %', category_name USING ERRCODE = '22023';
    END IF;
    RETURN QUERY EXECUTE format(
        'SELECT 
            name,
            ST_Y(ST_Centroid(geom)) AS lat,
            ST_X(ST_Centroid(geom)) AS long
         FROM %I', 
        category_name
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_report_zone()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public', 'extensions'
  AS $function$
BEGIN
  -- Extract zone from coordinates (not address)
  IF NEW.long IS NOT NULL AND NEW.lat IS NOT NULL THEN
    NEW.zone := extract_barangay_from_coordinates(NEW.long, NEW.lat);
  ELSE
    NEW.zone := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "Enable read access for all users" ON "public"."barangay_boundaries"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Public insert reports" ON "public"."reports"
  FOR INSERT
  TO PUBLIC
  WITH
    CHECK
    ((((status)::text = 'pending'::text) AND (NOT (user_id IS DISTINCT FROM ( SELECT auth.uid() AS uid))) AND (resolved_by_maintenance_id IS NULL) AND (resolved_image IS NULL)));

CREATE POLICY "Staff update reports" ON "public"."reports"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT private.current_agency_id() AS current_agency_id) IS NOT NULL))
  WITH CHECK ((( SELECT private.current_agency_id() AS current_agency_id) IS NOT NULL));

CREATE POLICY "Allow authenticated users to replace their own avatars" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'Avatars'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1])))
  WITH CHECK (((bucket_id = 'Avatars'::text) AND ((( SELECT auth.uid() AS uid))::text = (storage.foldername(name))[1])));

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."reports";

REVOKE ALL ON TABLE "public"."barangay_boundaries" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."barangay_boundaries" TO "anon";

REVOKE ALL ON TABLE "public"."barangay_boundaries" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."barangay_boundaries" TO "authenticated";
