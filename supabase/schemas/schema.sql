-- drAIn database schema (public). THE SOURCE OF TRUTH: edit this file, then
-- follow "Database workflow" in CLAUDE.md to generate a migration and types.
--
-- Started as a dump of the hosted project on 2026-09-26
-- (`npx supabase db dump --linked --schema public`).
--
-- REDACTED: trigger "trigger-geocode-on-insert" embeds a service_role JWT in
-- its Authorization header. It is replaced below with <SERVICE_ROLE_JWT>.
-- Never commit a fresh dump without redacting it the same way.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";

-- Not in a public-only dump, but the geometry/geography columns and the
-- geocode webhook trigger (supabase_functions.http_request) need them.
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."asset_point_type" AS ENUM (
    'inlet',
    'outlet',
    'stormdrain'
);


ALTER TYPE "public"."asset_point_type" OWNER TO "postgres";


CREATE TYPE "public"."drainage_status" AS ENUM (
    'Clean',
    'Needs_Cleaning',
    'Clogged',
    'Damaged',
    'Overflowing'
);


ALTER TYPE "public"."drainage_status" OWNER TO "postgres";


CREATE TYPE "public"."maintenance_type" AS ENUM (
    'Cleaning',
    'Repair',
    'Inspection',
    'Unclogging'
);


ALTER TYPE "public"."maintenance_type" OWNER TO "postgres";


CREATE TYPE "public"."report_status" AS ENUM (
    'pending',
    'received',
    'action_taken',
    'resolved',
    'rejected'
);


ALTER TYPE "public"."report_status" OWNER TO "postgres";


-- Who a person is to the app. citizen: reports issues. staff: belongs to an
-- agency and records maintenance. admin: staff who can also manage members
-- and join codes. Only citizens have no agency (profiles_staff_have_agency).
CREATE TYPE "public"."user_role" AS ENUM (
    'citizen',
    'staff',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_barangay_from_address"("address_text" "text") RETURNS character varying
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  matched_barangay VARCHAR(255);
BEGIN
  -- Return NULL if address is empty
  IF address_text IS NULL OR address_text = '' THEN
    RETURN NULL;
  END IF;

  -- List of 29 valid barangays from mandaue_population.geojson
  -- Ordered by length (longest first) to match longer names first
  SELECT name INTO matched_barangay
  FROM (VALUES
    ('Alang-alang'),
    ('Bakilid'),
    ('Banilad'),
    ('Basak'),
    ('Cabancalan'),
    ('Cambaro'),
    ('Canduman'),
    ('Casili'),
    ('Casuntingan'),
    ('Centro'),
    ('Cubacub'),
    ('Guizo'),
    ('Ibabao'),
    ('Jagobiao'),
    ('Labogon'),
    ('Looc'),
    ('Maguikay'),
    ('Mantuyong'),
    ('Opao'),
    ('Pagsabungan'),
    ('Pakna-an'),
    ('Recle'),
    ('Subangdaku'),
    ('Tabok'),
    ('Tawason'),
    ('Tingub'),
    ('Tipolo'),
    ('Umapad')
  ) AS barangays(name)
  WHERE LOWER(address_text) LIKE '%' || LOWER(name) || '%'
  LIMIT 1;

  RETURN matched_barangay;
END;
$$;


ALTER FUNCTION "public"."extract_barangay_from_address"("address_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_barangay_from_coordinates"("longitude" double precision, "latitude" double precision) RETURNS character varying
    LANGUAGE "plpgsql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."extract_barangay_from_coordinates"("longitude" double precision, "latitude" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_closest_inlet"("input_lat" double precision, "input_lon" double precision) RETURNS TABLE("name" character varying, "lat" double precision, "long" double precision, "distance" double precision)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_closest_inlet"("input_lat" double precision, "input_lon" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_closest_man_pipe"("input_lat" double precision, "input_lon" double precision) RETURNS TABLE("name" character varying, "lat" double precision, "long" double precision, "distance" double precision)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_closest_man_pipe"("input_lat" double precision, "input_lon" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_closest_outlet"("input_lat" double precision, "input_lon" double precision) RETURNS TABLE("name" character varying, "lat" double precision, "long" double precision, "distance" double precision)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_closest_outlet"("input_lat" double precision, "input_lon" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_closest_storm_drain"("input_lat" double precision, "input_lon" double precision) RETURNS TABLE("name" character varying, "lat" double precision, "long" double precision, "distance" double precision)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_closest_storm_drain"("input_lat" double precision, "input_lon" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_component_by_category"("category_name" "text") RETURNS TABLE("name" character varying, "lat" double precision, "long" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT 
            name,
            ST_Y(ST_Centroid(geom)) AS lat,
            ST_X(ST_Centroid(geom)) AS long
         FROM %I', 
        category_name
    );
END;
$$;


ALTER FUNCTION "public"."get_component_by_category"("category_name" "text") OWNER TO "postgres";


-- Creates the profiles row for every new account. Everyone starts as a
-- citizen: sign-up metadata is written by the client, so only full_name is
-- taken from it. People become staff through join_agency or an admin.
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


-- Guards profiles.role and profiles.agency_id, the two columns that grant
-- permissions. A signed-in user may edit the rest of their own row, but not
-- these. Deliberately SECURITY INVOKER: current_user is then the caller, so
-- a request from the API arrives as anon/authenticated and is refused, while
-- the SECURITY DEFINER functions below (join_agency, leave_agency,
-- set_member_agency), which run as postgres, pass after their own checks.
CREATE OR REPLACE FUNCTION "public"."protect_profile_privileges"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT private.is_admin() THEN
    IF TG_OP = 'INSERT' AND (NEW.role <> 'citizen' OR NEW.agency_id IS NOT NULL) THEN
      RAISE EXCEPTION 'New profiles start as citizens.' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role
                             OR NEW.agency_id IS DISTINCT FROM OLD.agency_id) THEN
      RAISE EXCEPTION 'Only an admin can change a role or agency.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_profile_privileges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_report_zone"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Extract zone from coordinates (not address)
  IF NEW.long IS NOT NULL AND NEW.lat IS NOT NULL THEN
    NEW.zone := extract_barangay_from_coordinates(NEW.long, NEW.lat);
  ELSE
    NEW.zone := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_report_zone"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."100YR" (
    "Node_ID" "text" NOT NULL,
    "Vulnerability_Category" "text",
    "Vulnerability_Rank" bigint,
    "Cluster" bigint,
    "Cluster_Score" double precision,
    "YR" "text",
    "Time_After_Raining_min" double precision,
    "Hours Flooded" double precision,
    "Maximum Rate (CMS)" double precision,
    "Time of Max (hr:min)" bigint,
    "Total Flood Volume (10^6 ltr)" double precision
);


ALTER TABLE "public"."100YR" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."10YR" (
    "Node_ID" "text" NOT NULL,
    "Vulnerability_Category" "text",
    "Vulnerability_Rank" bigint,
    "Cluster" bigint,
    "Cluster_Score" double precision,
    "YR" "text",
    "Time_After_Raining_min" double precision,
    "Hours Flooded" double precision,
    "Maximum Rate (CMS)" double precision,
    "Time of Max (hr:min)" bigint,
    "Total Flood Volume (10^6 ltr)" double precision
);


ALTER TABLE "public"."10YR" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."15YR" (
    "Node_ID" "text" NOT NULL,
    "Vulnerability_Category" "text",
    "Vulnerability_Rank" bigint,
    "Cluster" bigint,
    "Cluster_Score" double precision,
    "YR" "text",
    "Time_After_Raining_min" double precision,
    "Hours Flooded" double precision,
    "Maximum Rate (CMS)" double precision,
    "Time of Max (hr:min)" bigint,
    "Total Flood Volume (10^6 ltr)" double precision
);


ALTER TABLE "public"."15YR" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."20YR" (
    "Node_ID" "text" NOT NULL,
    "Vulnerability_Category" "text",
    "Vulnerability_Rank" bigint,
    "Cluster" bigint,
    "Cluster_Score" double precision,
    "YR" "text",
    "Time_After_Raining_min" double precision,
    "Hours Flooded" double precision,
    "Maximum Rate (CMS)" double precision,
    "Time of Max (hr:min)" bigint,
    "Total Flood Volume (10^6 ltr)" double precision
);


ALTER TABLE "public"."20YR" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."25YR" (
    "Node_ID" "text" NOT NULL,
    "Vulnerability_Category" "text",
    "Vulnerability_Rank" bigint,
    "Cluster" bigint,
    "Cluster_Score" double precision,
    "YR" "text",
    "Time_After_Raining_min" double precision,
    "Hours Flooded" double precision,
    "Maximum Rate (CMS)" double precision,
    "Time of Max (hr:min)" bigint,
    "Total Flood Volume (10^6 ltr)" double precision
);


ALTER TABLE "public"."25YR" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."2YR" (
    "Node_ID" "text",
    "Vulnerability_Category" "text",
    "Vulnerability_Rank" bigint,
    "Cluster" bigint,
    "Cluster_Score" double precision,
    "YR" "text",
    "Time_After_Raining_min" double precision,
    "Hours Flooded" double precision,
    "Maximum Rate (CMS)" double precision,
    "Time of Max (hr:min)" bigint,
    "Total Flood Volume (10^6 ltr)" double precision
);


ALTER TABLE "public"."2YR" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."50YR" (
    "Node_ID" "text" NOT NULL,
    "Vulnerability_Category" "text",
    "Vulnerability_Rank" bigint,
    "Cluster" bigint,
    "Cluster_Score" double precision,
    "YR" "text",
    "Time_After_Raining_min" double precision,
    "Hours Flooded" double precision,
    "Maximum Rate (CMS)" double precision,
    "Time of Max (hr:min)" bigint,
    "Total Flood Volume (10^6 ltr)" double precision
);


ALTER TABLE "public"."50YR" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."5YR" (
    "Node_ID" "text" NOT NULL,
    "Vulnerability_Category" "text",
    "Vulnerability_Rank" bigint,
    "Cluster" bigint,
    "Cluster_Score" double precision,
    "YR" "text",
    "Time_After_Raining_min" double precision,
    "Hours Flooded" double precision,
    "Maximum Rate (CMS)" double precision,
    "Time of Max (hr:min)" bigint,
    "Total Flood Volume (10^6 ltr)" double precision
);


ALTER TABLE "public"."5YR" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "name" "text" NOT NULL,
    "contact_details" "jsonb"
);


ALTER TABLE "public"."agencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."barangay_boundaries" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "boundary" "extensions"."geography"(Polygon,4326) NOT NULL,
    "population_count" character varying(50),
    "population_density" character varying(50),
    "land_area" character varying(50),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."barangay_boundaries" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."barangay_boundaries_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."barangay_boundaries_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."barangay_boundaries_id_seq" OWNED BY "public"."barangay_boundaries"."id";



CREATE TABLE IF NOT EXISTS "public"."geocode_worker_lock" (
    "id" integer DEFAULT 1 NOT NULL,
    "is_running" boolean DEFAULT false,
    "started_at" timestamp with time zone,
    "started_by" "text",
    CONSTRAINT "single_row" CHECK (("id" = 1))
);


ALTER TABLE "public"."geocode_worker_lock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inlets" (
    "gid" integer NOT NULL,
    "geom" "extensions"."geometry"(MultiPoint,4326),
    "x" double precision,
    "y" double precision,
    "inv_elev" double precision,
    "maxdepth" double precision,
    "length" double precision,
    "height" double precision,
    "weir_coeff" double precision,
    "in_type" integer,
    "name" character varying,
    "clogfac" integer,
    "clogtime" integer,
    "fplain_080" double precision
);


ALTER TABLE "public"."inlets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."inlets_gid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inlets_gid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inlets_gid_seq" OWNED BY "public"."inlets"."gid";



CREATE TABLE IF NOT EXISTS "public"."inlets_maintenance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_cleaned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "represented_by" "uuid" NOT NULL,
    "in_name" character varying NOT NULL,
    "addressed_report_id" "uuid",
    "status" "text",
    "description" "text" DEFAULT 'No Comments'::"text",
    "evidence_image" "text"
);


ALTER TABLE "public"."inlets_maintenance" OWNER TO "postgres";


COMMENT ON COLUMN "public"."inlets_maintenance"."description" IS 'agency comments';



CREATE TABLE IF NOT EXISTS "public"."man_pipes" (
    "gid" integer NOT NULL,
    "geom" "extensions"."geometry"(Geometry,4326),
    "type" character varying,
    "length" double precision,
    "width" double precision,
    "height" double precision,
    "pipe_shape" character varying,
    "pipe_lngth" double precision,
    "mannings" double precision,
    "barrels" integer,
    "name" character varying,
    "clogper" integer,
    "clogtime" integer
);


ALTER TABLE "public"."man_pipes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."man_pipes_gid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."man_pipes_gid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."man_pipes_gid_seq" OWNED BY "public"."man_pipes"."gid";



CREATE TABLE IF NOT EXISTS "public"."man_pipes_maintenance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_cleaned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "represented_by" "uuid" NOT NULL,
    "name" character varying NOT NULL,
    "addressed_report_id" "uuid",
    "status" "text",
    "description" "text" DEFAULT 'No Comments'::"text",
    "evidence_image" "text"
);


ALTER TABLE "public"."man_pipes_maintenance" OWNER TO "postgres";


COMMENT ON COLUMN "public"."man_pipes_maintenance"."description" IS 'agency comments';



CREATE TABLE IF NOT EXISTS "public"."outlets" (
    "gid" integer NOT NULL,
    "geom" "extensions"."geometry"(MultiPoint,4326),
    "join_count" integer,
    "target_fid" integer,
    "inv_elev" double precision,
    "allowq" integer,
    "flapgate" integer,
    "x" double precision,
    "y" double precision,
    "name" character varying,
    "fplain_080" double precision
);


ALTER TABLE "public"."outlets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."outlets_gid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."outlets_gid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."outlets_gid_seq" OWNED BY "public"."outlets"."gid";



CREATE TABLE IF NOT EXISTS "public"."outlets_maintenance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_cleaned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "represented_by" "uuid" NOT NULL,
    "out_name" character varying NOT NULL,
    "addressed_report_id" "uuid",
    "status" "text",
    "description" "text" DEFAULT 'No Comments'::"text",
    "evidence_image" "text"
);


ALTER TABLE "public"."outlets_maintenance" OWNER TO "postgres";


COMMENT ON COLUMN "public"."outlets_maintenance"."description" IS 'agency comments';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "agency_id" "uuid",
    "role" "public"."user_role" DEFAULT 'citizen'::"public"."user_role" NOT NULL,
    CONSTRAINT "profiles_staff_have_agency" CHECK ((("role" = 'citizen'::"public"."user_role") = ("agency_id" IS NULL)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "report_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL
);


ALTER TABLE "public"."report_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" character varying,
    "description" character varying,
    "image" "text",
    "reporter_name" character varying,
    "status" character varying NOT NULL,
    "component_id" "text",
    "long" double precision,
    "lat" double precision,
    "geocoded_status" "text" DEFAULT 'pending'::"text",
    "address" "text",
    "user_id" "uuid",
    "priority" "text" DEFAULT 'low'::"text",
    "zone" character varying(255),
    "resolved_by_maintenance_id" "uuid",
    "resolved_by_maintenance_type" "text",
    "resolved_image" "text",
    CONSTRAINT "reports_geocoded_status_check" CHECK (("geocoded_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "reports_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


COMMENT ON COLUMN "public"."reports"."priority" IS 'Priority level: low, medium, high, critical (manual assignment)';



COMMENT ON COLUMN "public"."reports"."zone" IS 'Barangay/zone extracted from address for GeoJSON matching';



CREATE TABLE IF NOT EXISTS "public"."storm_drains" (
    "gid" integer NOT NULL,
    "geom" "extensions"."geometry"(MultiPoint,4326),
    "invelev" double precision,
    "x" double precision,
    "y" double precision,
    "clog_per" integer,
    "clogtime" integer,
    "weir_coeff" double precision,
    "length" double precision,
    "height" double precision,
    "max_depth" double precision,
    "name" character varying,
    "clogfac" integer,
    "id" integer,
    "namenum" integer,
    "fplain_080" double precision
);


ALTER TABLE "public"."storm_drains" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."storm_drains_gid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."storm_drains_gid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."storm_drains_gid_seq" OWNED BY "public"."storm_drains"."gid";



CREATE TABLE IF NOT EXISTS "public"."storm_drains_maintenance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_cleaned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "represented_by" "uuid" NOT NULL,
    "in_name" character varying NOT NULL,
    "addressed_report_id" "uuid",
    "status" "text",
    "description" "text" DEFAULT 'No Comments'::"text",
    "evidence_image" "text"
);


ALTER TABLE "public"."storm_drains_maintenance" OWNER TO "postgres";


COMMENT ON COLUMN "public"."storm_drains_maintenance"."description" IS 'agency comments';



ALTER TABLE ONLY "public"."barangay_boundaries" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."barangay_boundaries_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inlets" ALTER COLUMN "gid" SET DEFAULT "nextval"('"public"."inlets_gid_seq"'::"regclass");



ALTER TABLE ONLY "public"."man_pipes" ALTER COLUMN "gid" SET DEFAULT "nextval"('"public"."man_pipes_gid_seq"'::"regclass");



ALTER TABLE ONLY "public"."outlets" ALTER COLUMN "gid" SET DEFAULT "nextval"('"public"."outlets_gid_seq"'::"regclass");



ALTER TABLE ONLY "public"."storm_drains" ALTER COLUMN "gid" SET DEFAULT "nextval"('"public"."storm_drains_gid_seq"'::"regclass");



ALTER TABLE ONLY "public"."100YR"
    ADD CONSTRAINT "100YR_pkey" PRIMARY KEY ("Node_ID");



ALTER TABLE ONLY "public"."10YR"
    ADD CONSTRAINT "10YR_pkey" PRIMARY KEY ("Node_ID");



ALTER TABLE ONLY "public"."15YR"
    ADD CONSTRAINT "15YR_pkey" PRIMARY KEY ("Node_ID");



ALTER TABLE ONLY "public"."20YR"
    ADD CONSTRAINT "20YR_pkey" PRIMARY KEY ("Node_ID");



ALTER TABLE ONLY "public"."25YR"
    ADD CONSTRAINT "25YR_pkey" PRIMARY KEY ("Node_ID");



ALTER TABLE ONLY "public"."50YR"
    ADD CONSTRAINT "50YR_pkey" PRIMARY KEY ("Node_ID");



ALTER TABLE ONLY "public"."5YR"
    ADD CONSTRAINT "5YR_pkey" PRIMARY KEY ("Node_ID");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "Report_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agencies"
    ADD CONSTRAINT "agencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."barangay_boundaries"
    ADD CONSTRAINT "barangay_boundaries_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."barangay_boundaries"
    ADD CONSTRAINT "barangay_boundaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geocode_worker_lock"
    ADD CONSTRAINT "geocode_worker_lock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inlets_maintenance"
    ADD CONSTRAINT "inlets_maintenance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inlets"
    ADD CONSTRAINT "inlets_pk" PRIMARY KEY ("gid");



ALTER TABLE ONLY "public"."man_pipes_maintenance"
    ADD CONSTRAINT "man_pipes_maintenance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."man_pipes"
    ADD CONSTRAINT "man_pipes_pk" PRIMARY KEY ("gid");



ALTER TABLE ONLY "public"."outlets_maintenance"
    ADD CONSTRAINT "outlets_maintenance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outlets"
    ADD CONSTRAINT "outlets_pk" PRIMARY KEY ("gid");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_comments"
    ADD CONSTRAINT "report_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storm_drains_maintenance"
    ADD CONSTRAINT "storm_drains_maintenance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storm_drains"
    ADD CONSTRAINT "storm_drains_pk" PRIMARY KEY ("gid");



CREATE INDEX "100_yr_node_id" ON "public"."100YR" USING "btree" ("Node_ID");



CREATE INDEX "10_yr_node_id" ON "public"."10YR" USING "btree" ("Node_ID");



CREATE INDEX "15_yr_node_id" ON "public"."15YR" USING "btree" ("Node_ID");



CREATE INDEX "20_yr_node_id" ON "public"."20YR" USING "btree" ("Node_ID");



CREATE INDEX "25_yr_node_id" ON "public"."25YR" USING "btree" ("Node_ID");



CREATE INDEX "2_yr_node_id" ON "public"."2YR" USING "btree" ("Node_ID");



CREATE INDEX "50_yr_node_id" ON "public"."50YR" USING "btree" ("Node_ID");



CREATE INDEX "5_yr_node_id" ON "public"."5YR" USING "btree" ("Node_ID");



CREATE INDEX "idx_barangay_boundary_gist" ON "public"."barangay_boundaries" USING "gist" ("boundary");



CREATE INDEX "idx_geocode_lock" ON "public"."geocode_worker_lock" USING "btree" ("is_running");



CREATE INDEX "idx_geocode_pending" ON "public"."reports" USING "btree" ("geocoded_status") WHERE ("geocoded_status" = 'pending'::"text");



CREATE INDEX "idx_report_category" ON "public"."reports" USING "btree" ("category") WHERE (("category")::"text" = 'inlet'::"text");



CREATE INDEX "idx_reports_component_id" ON "public"."reports" USING "btree" ("component_id");



CREATE INDEX "idx_reports_created_at" ON "public"."reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reports_priority" ON "public"."reports" USING "btree" ("priority");



CREATE INDEX "idx_reports_status" ON "public"."reports" USING "btree" ("status");



CREATE INDEX "idx_reports_zone" ON "public"."reports" USING "btree" ("zone");



CREATE INDEX "inlets_geom_geom_idx" ON "public"."inlets" USING "gist" ("geom");



CREATE INDEX "man_pipes_geom_geom_idx" ON "public"."man_pipes" USING "gist" ("geom");



CREATE INDEX "outlets_geom_geom_idx" ON "public"."outlets" USING "gist" ("geom");



CREATE INDEX "storm_drains_geom_geom_idx" ON "public"."storm_drains" USING "gist" ("geom");



CREATE OR REPLACE TRIGGER "protect_profile_privileges" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_profile_privileges"();



CREATE OR REPLACE TRIGGER "trigger-geocode-on-insert" AFTER INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://jpwbdhksmnrtfutcmpht.supabase.co/functions/v1/geocodeWorker', 'POST', '{"Content-type":"application/json","Authorization":"Bearer <SERVICE_ROLE_JWT>"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "trigger_update_report_zone" BEFORE INSERT OR UPDATE OF "long", "lat" ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_report_zone"();



ALTER TABLE ONLY "public"."inlets_maintenance"
    ADD CONSTRAINT "inlets_maintenance_addressed_report_id_fkey" FOREIGN KEY ("addressed_report_id") REFERENCES "public"."reports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inlets_maintenance"
    ADD CONSTRAINT "inlets_maintenance_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."inlets_maintenance"
    ADD CONSTRAINT "inlets_maintenance_represented_by_fkey" FOREIGN KEY ("represented_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."man_pipes_maintenance"
    ADD CONSTRAINT "man_pipes_maintenance_addressed_report_id_fkey" FOREIGN KEY ("addressed_report_id") REFERENCES "public"."reports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."man_pipes_maintenance"
    ADD CONSTRAINT "man_pipes_maintenance_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."man_pipes_maintenance"
    ADD CONSTRAINT "man_pipes_maintenance_represented_by_fkey" FOREIGN KEY ("represented_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."outlets_maintenance"
    ADD CONSTRAINT "outlets_maintenance_addressed_report_id_fkey" FOREIGN KEY ("addressed_report_id") REFERENCES "public"."reports"("id");



ALTER TABLE ONLY "public"."outlets_maintenance"
    ADD CONSTRAINT "outlets_maintenance_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."outlets_maintenance"
    ADD CONSTRAINT "outlets_maintenance_represented_by_fkey" FOREIGN KEY ("represented_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_comments"
    ADD CONSTRAINT "report_comments_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id");



ALTER TABLE ONLY "public"."report_comments"
    ADD CONSTRAINT "report_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."storm_drains_maintenance"
    ADD CONSTRAINT "storm_drains_maintenance_addressed_report_id_fkey" FOREIGN KEY ("addressed_report_id") REFERENCES "public"."reports"("id");



ALTER TABLE ONLY "public"."storm_drains_maintenance"
    ADD CONSTRAINT "storm_drains_maintenance_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."storm_drains_maintenance"
    ADD CONSTRAINT "storm_drains_maintenance_represented_by_fkey" FOREIGN KEY ("represented_by") REFERENCES "public"."profiles"("id");



ALTER TABLE "public"."100YR" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."10YR" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."15YR" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."20YR" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."25YR" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."2YR" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."50YR" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."5YR" ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- Permissions. The private schema is not exposed through the API (only
-- public and graphql_public are, see config.toml), so its tables can't be
-- read by clients and its functions can only be reached from policies and
-- other functions. anon/authenticated need USAGE to evaluate policies that
-- call these helpers.
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS "private";

GRANT USAGE ON SCHEMA "private" TO "anon", "authenticated", "service_role";


-- The caller's agency if they are staff or admin, else null. Policies use it
-- as `(select private.current_agency_id())` so it runs once per query.
CREATE OR REPLACE FUNCTION "private"."current_agency_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p.agency_id
  from public.profiles p
  where p.id = (select auth.uid()) and p.role in ('staff', 'admin')
$$;


ALTER FUNCTION "private"."current_agency_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
$$;


ALTER FUNCTION "private"."is_admin"() OWNER TO "postgres";


-- True for an admin, the service role, or a direct database session (SQL
-- editor, seeds, migrations), which carries no API role claim. API callers
-- always carry one, so anon and ordinary signed-in users get false.
CREATE OR REPLACE FUNCTION "private"."can_manage_members"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(auth.role(), 'postgres') not in ('anon', 'authenticated')
         or private.is_admin()
$$;


ALTER FUNCTION "private"."can_manage_members"() OWNER TO "postgres";


-- One join code per agency. Only a bcrypt hash is kept; the plain code is
-- returned once by rotate_agency_join_code and must be passed on by hand.
-- Codes are compared after normalize_join_code, so case, spaces and dashes
-- don't matter.
CREATE TABLE IF NOT EXISTS "private"."agency_join_codes" (
    "agency_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "rotated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agency_join_codes_pkey" PRIMARY KEY ("agency_id"),
    CONSTRAINT "agency_join_codes_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE CASCADE
);


ALTER TABLE "private"."agency_join_codes" OWNER TO "postgres";


ALTER TABLE "private"."agency_join_codes" ENABLE ROW LEVEL SECURITY;


CREATE OR REPLACE FUNCTION "private"."normalize_join_code"("code" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select regexp_replace(upper(coalesce(code, '')), '[^A-Z0-9]', '', 'g')
$$;


ALTER FUNCTION "private"."normalize_join_code"("code" "text") OWNER TO "postgres";


-- Admin only. Replaces the agency's join code and returns the new one, e.g.
-- 'K7QM-W2XP-9D'. 10 characters from a 32-letter alphabet (no 0/O, 1/I) is
-- about 50 bits, and every guess costs a bcrypt comparison per agency.
-- From the SQL editor: select public.rotate_agency_join_code('<agency id>');
CREATE OR REPLACE FUNCTION "public"."rotate_agency_join_code"("p_agency_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw text := '';
BEGIN
  IF NOT private.can_manage_members() THEN
    RAISE EXCEPTION 'Only an admin can rotate a join code.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE id = p_agency_id) THEN
    RAISE EXCEPTION 'No such agency.' USING ERRCODE = 'P0002';
  END IF;

  -- 256 is a multiple of 32, so taking each random byte mod 32 is unbiased.
  FOR i IN 1..10 LOOP
    raw := raw || substr(alphabet, 1 + get_byte(extensions.gen_random_bytes(1), 0) % 32, 1);
  END LOOP;

  INSERT INTO private.agency_join_codes (agency_id, code_hash, rotated_at)
  VALUES (p_agency_id, extensions.crypt(raw, extensions.gen_salt('bf')), now())
  ON CONFLICT (agency_id) DO UPDATE
    SET code_hash = excluded.code_hash, rotated_at = excluded.rotated_at;

  RETURN substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 2);
END;
$$;


ALTER FUNCTION "public"."rotate_agency_join_code"("p_agency_id" "uuid") OWNER TO "postgres";


-- A signed-in citizen enters their agency's code and becomes its staff.
-- Returns the agency. The error for a wrong code doesn't say whether any
-- agency exists.
CREATE OR REPLACE FUNCTION "public"."join_agency"("p_code" "text") RETURNS "public"."agencies"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  candidate text := private.normalize_join_code(p_code);
  matched public.agencies;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to join an agency.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role <> 'citizen') THEN
    RAISE EXCEPTION 'You are already part of an agency. Leave it first.' USING ERRCODE = 'P0001';
  END IF;

  SELECT a.* INTO matched
  FROM private.agency_join_codes c
  JOIN public.agencies a ON a.id = c.agency_id
  WHERE c.code_hash = extensions.crypt(candidate, c.code_hash)
  LIMIT 1;

  IF matched.id IS NULL THEN
    RAISE EXCEPTION 'That code is not valid.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.profiles SET role = 'staff', agency_id = matched.id WHERE id = auth.uid();
  RETURN matched;
END;
$$;


ALTER FUNCTION "public"."join_agency"("p_code" "text") OWNER TO "postgres";


-- Staff leave their agency and become citizens again. Admins can't, so an
-- agency can't lose its last admin by accident; another admin demotes them.
CREATE OR REPLACE FUNCTION "public"."leave_agency"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.profiles SET role = 'citizen', agency_id = NULL
  WHERE id = auth.uid() AND role = 'staff';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only agency staff can leave an agency.' USING ERRCODE = 'P0001';
  END IF;
END;
$$;


ALTER FUNCTION "public"."leave_agency"() OWNER TO "postgres";


-- Admin only: set anyone's role and agency directly. A citizen's agency is
-- cleared; staff and admins must be given one (profiles_staff_have_agency).
CREATE OR REPLACE FUNCTION "public"."set_member_agency"("p_user_id" "uuid", "p_agency_id" "uuid", "p_role" "public"."user_role") RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  result public.profiles;
BEGIN
  IF NOT private.can_manage_members() THEN
    RAISE EXCEPTION 'Only an admin can change a role or agency.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET role = p_role,
      agency_id = CASE WHEN p_role = 'citizen' THEN NULL ELSE p_agency_id END
  WHERE id = p_user_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'No such user.' USING ERRCODE = 'P0002';
  END IF;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."set_member_agency"("p_user_id" "uuid", "p_agency_id" "uuid", "p_role" "public"."user_role") OWNER TO "postgres";


-- Signed-out callers never need these.
REVOKE ALL ON FUNCTION "public"."rotate_agency_join_code"("p_agency_id" "uuid") FROM PUBLIC, "anon";
REVOKE ALL ON FUNCTION "public"."join_agency"("p_code" "text") FROM PUBLIC, "anon";
REVOKE ALL ON FUNCTION "public"."leave_agency"() FROM PUBLIC, "anon";
REVOKE ALL ON FUNCTION "public"."set_member_agency"("p_user_id" "uuid", "p_agency_id" "uuid", "p_role" "public"."user_role") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."rotate_agency_join_code"("p_agency_id" "uuid") TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."join_agency"("p_code" "text") TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."leave_agency"() TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."set_member_agency"("p_user_id" "uuid", "p_agency_id" "uuid", "p_role" "public"."user_role") TO "authenticated", "service_role";


-- A user can insert, read and update only their own profile.
-- protect_profile_privileges stops them changing role or agency_id.
CREATE POLICY "Allow individual insert access" ON "public"."profiles" FOR INSERT WITH CHECK (((select "auth"."uid"()) = "id"));



CREATE POLICY "Allow individual read access" ON "public"."profiles" FOR SELECT USING (((select "auth"."uid"()) = "id"));



CREATE POLICY "Allow individual update access" ON "public"."profiles" FOR UPDATE USING (((select "auth"."uid"()) = "id")) WITH CHECK (((select "auth"."uid"()) = "id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."inlets_maintenance" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."man_pipes_maintenance" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."outlets_maintenance" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."storm_drains_maintenance" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."100YR" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."10YR" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."15YR" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."20YR" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."25YR" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."2YR" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."50YR" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."5YR" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."agencies" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."inlets" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."inlets_maintenance" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."man_pipes" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."man_pipes_maintenance" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."outlets" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."outlets_maintenance" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."report_comments" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."reports" FOR DELETE USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."storm_drains" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."storm_drains_maintenance" FOR SELECT USING (true);



CREATE POLICY "Public insert report comments" ON "public"."report_comments" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public insert reports" ON "public"."reports" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public select reports" ON "public"."reports" FOR SELECT USING (true);



CREATE POLICY "Public update reports" ON "public"."reports" FOR UPDATE USING (true);



ALTER TABLE "public"."agencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geocode_worker_lock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inlets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inlets_maintenance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."man_pipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."man_pipes_maintenance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."outlets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."outlets_maintenance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storm_drains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storm_drains_maintenance" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_barangay_from_address"("address_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."extract_barangay_from_address"("address_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_barangay_from_address"("address_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_barangay_from_coordinates"("longitude" double precision, "latitude" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."extract_barangay_from_coordinates"("longitude" double precision, "latitude" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_barangay_from_coordinates"("longitude" double precision, "latitude" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_closest_inlet"("input_lat" double precision, "input_lon" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."get_closest_inlet"("input_lat" double precision, "input_lon" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_closest_inlet"("input_lat" double precision, "input_lon" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_closest_man_pipe"("input_lat" double precision, "input_lon" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."get_closest_man_pipe"("input_lat" double precision, "input_lon" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_closest_man_pipe"("input_lat" double precision, "input_lon" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_closest_outlet"("input_lat" double precision, "input_lon" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."get_closest_outlet"("input_lat" double precision, "input_lon" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_closest_outlet"("input_lat" double precision, "input_lon" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_closest_storm_drain"("input_lat" double precision, "input_lon" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."get_closest_storm_drain"("input_lat" double precision, "input_lon" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_closest_storm_drain"("input_lat" double precision, "input_lon" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_component_by_category"("category_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_component_by_category"("category_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_component_by_category"("category_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_profile_privileges"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_profile_privileges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_profile_privileges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_report_zone"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_report_zone"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_report_zone"() TO "service_role";



GRANT ALL ON TABLE "public"."100YR" TO "anon";
GRANT ALL ON TABLE "public"."100YR" TO "authenticated";
GRANT ALL ON TABLE "public"."100YR" TO "service_role";



GRANT ALL ON TABLE "public"."10YR" TO "anon";
GRANT ALL ON TABLE "public"."10YR" TO "authenticated";
GRANT ALL ON TABLE "public"."10YR" TO "service_role";



GRANT ALL ON TABLE "public"."15YR" TO "anon";
GRANT ALL ON TABLE "public"."15YR" TO "authenticated";
GRANT ALL ON TABLE "public"."15YR" TO "service_role";



GRANT ALL ON TABLE "public"."20YR" TO "anon";
GRANT ALL ON TABLE "public"."20YR" TO "authenticated";
GRANT ALL ON TABLE "public"."20YR" TO "service_role";



GRANT ALL ON TABLE "public"."25YR" TO "anon";
GRANT ALL ON TABLE "public"."25YR" TO "authenticated";
GRANT ALL ON TABLE "public"."25YR" TO "service_role";



GRANT ALL ON TABLE "public"."2YR" TO "anon";
GRANT ALL ON TABLE "public"."2YR" TO "authenticated";
GRANT ALL ON TABLE "public"."2YR" TO "service_role";



GRANT ALL ON TABLE "public"."50YR" TO "anon";
GRANT ALL ON TABLE "public"."50YR" TO "authenticated";
GRANT ALL ON TABLE "public"."50YR" TO "service_role";



GRANT ALL ON TABLE "public"."5YR" TO "anon";
GRANT ALL ON TABLE "public"."5YR" TO "authenticated";
GRANT ALL ON TABLE "public"."5YR" TO "service_role";



GRANT ALL ON TABLE "public"."agencies" TO "anon";
GRANT ALL ON TABLE "public"."agencies" TO "authenticated";
GRANT ALL ON TABLE "public"."agencies" TO "service_role";



GRANT ALL ON TABLE "public"."barangay_boundaries" TO "anon";
GRANT ALL ON TABLE "public"."barangay_boundaries" TO "authenticated";
GRANT ALL ON TABLE "public"."barangay_boundaries" TO "service_role";



GRANT ALL ON SEQUENCE "public"."barangay_boundaries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."barangay_boundaries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."barangay_boundaries_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."geocode_worker_lock" TO "anon";
GRANT ALL ON TABLE "public"."geocode_worker_lock" TO "authenticated";
GRANT ALL ON TABLE "public"."geocode_worker_lock" TO "service_role";



GRANT ALL ON TABLE "public"."inlets" TO "anon";
GRANT ALL ON TABLE "public"."inlets" TO "authenticated";
GRANT ALL ON TABLE "public"."inlets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inlets_gid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inlets_gid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inlets_gid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inlets_maintenance" TO "anon";
GRANT ALL ON TABLE "public"."inlets_maintenance" TO "authenticated";
GRANT ALL ON TABLE "public"."inlets_maintenance" TO "service_role";



GRANT ALL ON TABLE "public"."man_pipes" TO "anon";
GRANT ALL ON TABLE "public"."man_pipes" TO "authenticated";
GRANT ALL ON TABLE "public"."man_pipes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."man_pipes_gid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."man_pipes_gid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."man_pipes_gid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."man_pipes_maintenance" TO "anon";
GRANT ALL ON TABLE "public"."man_pipes_maintenance" TO "authenticated";
GRANT ALL ON TABLE "public"."man_pipes_maintenance" TO "service_role";



GRANT ALL ON TABLE "public"."outlets" TO "anon";
GRANT ALL ON TABLE "public"."outlets" TO "authenticated";
GRANT ALL ON TABLE "public"."outlets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."outlets_gid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."outlets_gid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."outlets_gid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."outlets_maintenance" TO "anon";
GRANT ALL ON TABLE "public"."outlets_maintenance" TO "authenticated";
GRANT ALL ON TABLE "public"."outlets_maintenance" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."report_comments" TO "anon";
GRANT ALL ON TABLE "public"."report_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."report_comments" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."storm_drains" TO "anon";
GRANT ALL ON TABLE "public"."storm_drains" TO "authenticated";
GRANT ALL ON TABLE "public"."storm_drains" TO "service_role";



GRANT ALL ON SEQUENCE "public"."storm_drains_gid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."storm_drains_gid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."storm_drains_gid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."storm_drains_maintenance" TO "anon";
GRANT ALL ON TABLE "public"."storm_drains_maintenance" TO "authenticated";
GRANT ALL ON TABLE "public"."storm_drains_maintenance" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







