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



-- Where a report stands. Reports start pending; record_maintenance moves
-- them to in-progress or resolved. Spelled as the app already spells them.
CREATE TYPE "public"."report_status" AS ENUM (
    'pending',
    'in-progress',
    'resolved'
);


ALTER TYPE "public"."report_status" OWNER TO "postgres";


-- How urgent the reporter says it is.
CREATE TYPE "public"."report_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE "public"."report_priority" OWNER TO "postgres";


-- Who a person is to the app. citizen: reports issues. staff: belongs to an
-- agency and records maintenance. admin: staff who can also manage members
-- and join codes. Only citizens have no agency (profiles_staff_have_agency).
CREATE TYPE "public"."user_role" AS ENUM (
    'citizen',
    'staff',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


-- The four kinds of drainage component, spelled as the app already spells
-- them (reports.category, the map layers, the dashboard).
CREATE TYPE "public"."component_type" AS ENUM (
    'inlets',
    'outlets',
    'storm_drains',
    'man_pipes'
);


ALTER TYPE "public"."component_type" OWNER TO "postgres";


CREATE TYPE "public"."maintenance_status" AS ENUM (
    'in-progress',
    'resolved'
);


ALTER TYPE "public"."maintenance_status" OWNER TO "postgres";


-- What agency staff made of a citizen report (review_report). Rejected
-- reports (spam, duplicates, not a drainage problem) stay in the table for
-- the record but drop out of every count, map pin and public list.
CREATE TYPE "public"."report_review" AS ENUM (
    'unreviewed',
    'confirmed',
    'rejected'
);


ALTER TYPE "public"."report_review" OWNER TO "postgres";


-- Where the report's photo says it was taken, against the component the
-- report is filed on (check_report_submission). match: within 100 m.
-- mismatch: further. missing: the photo carried no location.
--
-- A signal for staff triage, not proof: the location comes from the photo's
-- EXIF block, read in the reporter's browser, and EXIF is easy to edit.
CREATE TYPE "public"."photo_location_check" AS ENUM (
    'match',
    'mismatch',
    'missing'
);


ALTER TYPE "public"."photo_location_check" OWNER TO "postgres";


-- Whether finished work has been checked by someone other than the person
-- who did it (see maintenance_reviews in schema_trust.sql). Only resolved
-- maintenance is checked; in-progress work stays unverified.
CREATE TYPE "public"."verification_status" AS ENUM (
    'unverified',
    'verified',
    'disputed'
);


ALTER TYPE "public"."verification_status" OWNER TO "postgres";


-- One reviewer's word on a fix: it holds, or it doesn't.
CREATE TYPE "public"."review_verdict" AS ENUM (
    'confirmed',
    'disputed'
);


ALTER TYPE "public"."review_verdict" OWNER TO "postgres";



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


-- SECURITY DEFINER so the lookup in private needs no grant to API roles.
CREATE OR REPLACE FUNCTION "public"."update_report_zone"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Extract zone from coordinates (not address)
  IF NEW.long IS NOT NULL AND NEW.lat IS NOT NULL THEN
    NEW.zone := private.extract_barangay_from_coordinates(NEW.long, NEW.lat);
  ELSE
    NEW.zone := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_report_zone"() OWNER TO "postgres";


-- The components of one type within p_radius_m metres of a point, nearest
-- first. The report form uses it to suggest what a photo is of. Distances
-- are in metres; the ORDER BY walks idx_components_location.
CREATE OR REPLACE FUNCTION "public"."nearest_components"("p_type" "public"."component_type", "p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision DEFAULT 50, "p_max_results" integer DEFAULT 3) RETURNS TABLE("name" "text", "lat" double precision, "long" double precision, "distance" double precision)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
  select c.name,
         st_y(c.location::geometry),
         st_x(c.location::geometry),
         st_distance(c.location, q.point)
  from public.components c,
       (select st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography as point) q
  where c.type = p_type
    and st_dwithin(c.location, q.point, p_radius_m)
  order by c.location <-> q.point
  limit p_max_results
$$;


ALTER FUNCTION "public"."nearest_components"("p_type" "public"."component_type", "p_lat" double precision, "p_lon" double precision, "p_radius_m" double precision, "p_max_results" integer) OWNER TO "postgres";


-- The name shown on a signed-in person's report comes from their profile,
-- not from the client: their full name, or 'Anonymous' if they turned off
-- show_name_on_reports. A hidden name is never written to the report.
-- Anonymous reports (no user_id) keep whatever name was typed.
CREATE OR REPLACE FUNCTION "public"."set_reporter_name"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT CASE WHEN p.show_name_on_reports THEN coalesce(nullif(p.full_name, ''), 'Anonymous')
                ELSE 'Anonymous' END
    INTO NEW.reporter_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_reporter_name"() OWNER TO "postgres";


-- Keeps existing reports in step when someone changes their name or the
-- show_name_on_reports setting, so hiding the name is retroactive.
-- SECURITY DEFINER because only staff may update reports directly.
CREATE OR REPLACE FUNCTION "public"."sync_reporter_name"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.reports
  SET reporter_name = CASE WHEN NEW.show_name_on_reports
                           THEN coalesce(nullif(NEW.full_name, ''), 'Anonymous')
                           ELSE 'Anonymous' END
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_reporter_name"() OWNER TO "postgres";


-- Stamps updated_at on every change, so clients don't have to (and can't
-- write a misleading one).
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


-- Flood simulation results per drainage node, one row per node and return
-- period (a 2-year, 5-year, ... 100-year storm). Replaces the eight tables
-- "2YR" ... "100YR", which had identical columns. Loaded from
-- supabase/seed/reference_data.sql; the app only reads it.
CREATE TABLE IF NOT EXISTS "public"."flood_results" (
    "return_period" smallint NOT NULL,
    "node_id" "text" NOT NULL,
    "vulnerability_category" "text" NOT NULL,
    "vulnerability_rank" integer NOT NULL,
    "cluster" integer NOT NULL,
    "cluster_score" double precision NOT NULL,
    "time_after_raining_min" double precision NOT NULL,
    "hours_flooded" double precision NOT NULL,
    "max_rate_cms" double precision NOT NULL,
    "time_of_max" integer NOT NULL,
    "total_flood_volume_megalitres" double precision NOT NULL,
    CONSTRAINT "flood_results_pkey" PRIMARY KEY ("return_period", "node_id"),
    CONSTRAINT "flood_results_return_period_check" CHECK (("return_period" = ANY (ARRAY[2, 5, 10, 15, 20, 25, 50, 100])))
);


ALTER TABLE "public"."flood_results" OWNER TO "postgres";


COMMENT ON COLUMN "public"."flood_results"."time_after_raining_min" IS 'Minutes of rain before the node overflows. 9999 in older exports means it never overflows (see normaliseOverflowMinutes).';



COMMENT ON COLUMN "public"."flood_results"."max_rate_cms" IS 'Peak flow, cubic metres per second.';



COMMENT ON COLUMN "public"."flood_results"."time_of_max" IS 'When the peak flow happens, as exported by the model. Its column was labelled "hr:min" but holds a whole number.';



COMMENT ON COLUMN "public"."flood_results"."total_flood_volume_megalitres" IS 'Total flood volume in millions of litres (the export''s "10^6 ltr").';



-- Every drainage component the app can point at, by name, with one point to
-- measure distance from. reports.component_id and maintenance.component_name
-- refer to it. Filled from inlets, outlets, storm_drains and man_pipes (the
-- GIS imports, which keep the full geometry and hydraulic attributes); pipes
-- are lines, so their point is the centroid.
CREATE TABLE IF NOT EXISTS "public"."components" (
    "name" "text" NOT NULL,
    "type" "public"."component_type" NOT NULL,
    "location" "extensions"."geography"(Point,4326) NOT NULL,
    CONSTRAINT "components_pkey" PRIMARY KEY ("name")
);


ALTER TABLE "public"."components" OWNER TO "postgres";


-- Latitude and longitude of each component, for lists and map markers.
CREATE OR REPLACE VIEW "public"."component_locations" WITH ("security_invoker"='true') AS
 SELECT "components"."name",
    "components"."type",
    "extensions"."st_y"(("components"."location")::"extensions"."geometry") AS "lat",
    "extensions"."st_x"(("components"."location")::"extensions"."geometry") AS "long"
   FROM "public"."components";


ALTER VIEW "public"."component_locations" OWNER TO "postgres";


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
    "population_count" integer,
    "population_density" numeric, -- people per km²
    "land_area" numeric, -- km²
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



-- A one-row lock for the geocodeWorker edge function, so only one run
-- geocodes at a time. RLS is on with no policies on purpose: only the
-- service role (the edge function) touches it. The function's source is
-- not in this repo yet (see DATABASE_AUDIT.md, D7, and the note on
-- trigger-geocode-on-insert).
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



-- Work done on one drainage component by agency staff. Replaces the four
-- per-type tables (inlets_, outlets_, storm_drains_, man_pipes_maintenance).
-- Written only through record_maintenance, which also moves the
-- component's open reports along in the same transaction.
CREATE TABLE IF NOT EXISTS "public"."maintenance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "component_type" "public"."component_type" NOT NULL,
    "component_name" "text" NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "performed_by" "uuid",
    "status" "public"."maintenance_status" NOT NULL,
    "description" "text",
    "evidence_image" "text",
    "verification_status" "public"."verification_status" DEFAULT 'unverified'::"public"."verification_status" NOT NULL,
    CONSTRAINT "maintenance_pkey" PRIMARY KEY ("id")
);


ALTER TABLE "public"."maintenance" OWNER TO "postgres";


COMMENT ON COLUMN "public"."maintenance"."component_name" IS 'The component''s name, e.g. I-0, O-0, ISD-1, C-0; matches reports.component_id.';



COMMENT ON COLUMN "public"."maintenance"."performed_by" IS 'The staff member who recorded it. Null once their account is deleted; agency_id still says who did the work.';



COMMENT ON COLUMN "public"."maintenance"."verification_status" IS 'Kept by review_maintenance and respond_to_resolution from maintenance_reviews: disputed if anyone disputed it, verified if someone other than the person who did it confirmed it, else unverified.';



COMMENT ON COLUMN "public"."maintenance"."description" IS 'Agency comments, including photo notes and evidence-check notes.';



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



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "agency_id" "uuid",
    "role" "public"."user_role" DEFAULT 'citizen'::"public"."user_role" NOT NULL,
    "show_name_on_reports" boolean DEFAULT true NOT NULL,
    CONSTRAINT "profiles_staff_have_agency" CHECK ((("role" = 'citizen'::"public"."user_role") = ("agency_id" IS NULL)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."show_name_on_reports" IS 'When false, this person''s reports show "Anonymous" instead of their name. Applied by set_reporter_name and sync_reporter_name.';


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "public"."component_type",
    "description" character varying,
    "image" "text",
    "reporter_name" character varying,
    "status" "public"."report_status" DEFAULT 'pending'::"public"."report_status" NOT NULL,
    "component_id" "text",
    "long" double precision,
    "lat" double precision,
    -- Written only by the hosted geocodeWorker; see trigger-geocode-on-insert.
    "geocoded_status" "text" DEFAULT 'pending'::"text",
    "address" "text",
    "user_id" "uuid",
    "priority" "public"."report_priority" DEFAULT 'low'::"public"."report_priority" NOT NULL,
    "zone" character varying(255),
    "resolved_at" timestamp with time zone,
    "resolved_by_maintenance_id" "uuid",
    "resolved_image" "text",
    "photo_lat" double precision,
    "photo_lon" double precision,
    "photo_taken_at" timestamp with time zone,
    "photo_distance_m" double precision,
    "photo_check" "public"."photo_location_check" DEFAULT 'missing'::"public"."photo_location_check" NOT NULL,
    "review_status" "public"."report_review" DEFAULT 'unreviewed'::"public"."report_review" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_note" "text",
    CONSTRAINT "reports_photo_lat_range" CHECK ((("photo_lat" >= ('-90'::integer)::double precision) AND ("photo_lat" <= (90)::double precision))),
    CONSTRAINT "reports_photo_lon_range" CHECK ((("photo_lon" >= ('-180'::integer)::double precision) AND ("photo_lon" <= (180)::double precision))),
    CONSTRAINT "reports_geocoded_status_check" CHECK (("geocoded_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


COMMENT ON COLUMN "public"."reports"."priority" IS 'Set by the reporter when filing; staff may change it when they review the report (review_report).';



COMMENT ON COLUMN "public"."reports"."photo_lat" IS 'Latitude from the photo''s EXIF GPS, sent by the reporter''s browser. Null when the photo had none.';



COMMENT ON COLUMN "public"."reports"."photo_taken_at" IS 'When the photo says it was taken (EXIF DateTimeOriginal), sent by the reporter''s browser.';



COMMENT ON COLUMN "public"."reports"."photo_distance_m" IS 'Metres from the photo''s GPS position to the component. Computed by check_report_submission; whatever the client sends is overwritten.';



COMMENT ON COLUMN "public"."reports"."review_status" IS 'Set only by review_report. New reports always start unreviewed.';



COMMENT ON COLUMN "public"."reports"."resolved_by_maintenance_id" IS 'The maintenance that last moved this report along (in-progress or resolved). Set only by record_maintenance.';



COMMENT ON COLUMN "public"."reports"."resolved_at" IS 'When the maintenance that resolved this report was done. Set only by record_maintenance.';



COMMENT ON COLUMN "public"."reports"."zone" IS 'The barangay containing the report''s coordinates, set by update_report_zone from barangay_boundaries ("Outside Mandaue" if none). Matches the barangay names in the map GeoJSON.';



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



ALTER TABLE ONLY "public"."barangay_boundaries" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."barangay_boundaries_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inlets" ALTER COLUMN "gid" SET DEFAULT "nextval"('"public"."inlets_gid_seq"'::"regclass");



ALTER TABLE ONLY "public"."man_pipes" ALTER COLUMN "gid" SET DEFAULT "nextval"('"public"."man_pipes_gid_seq"'::"regclass");



ALTER TABLE ONLY "public"."outlets" ALTER COLUMN "gid" SET DEFAULT "nextval"('"public"."outlets_gid_seq"'::"regclass");



ALTER TABLE ONLY "public"."storm_drains" ALTER COLUMN "gid" SET DEFAULT "nextval"('"public"."storm_drains_gid_seq"'::"regclass");



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



ALTER TABLE ONLY "public"."inlets"
    ADD CONSTRAINT "inlets_pk" PRIMARY KEY ("gid");



ALTER TABLE ONLY "public"."man_pipes"
    ADD CONSTRAINT "man_pipes_pk" PRIMARY KEY ("gid");



ALTER TABLE ONLY "public"."outlets"
    ADD CONSTRAINT "outlets_pk" PRIMARY KEY ("gid");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storm_drains"
    ADD CONSTRAINT "storm_drains_pk" PRIMARY KEY ("gid");



-- Nearest-component lookups (nearest_components) walk this index.
CREATE INDEX "idx_components_location" ON "public"."components" USING "gist" ("location");



CREATE INDEX "idx_components_type" ON "public"."components" USING "btree" ("type");



CREATE INDEX "idx_barangay_boundary_gist" ON "public"."barangay_boundaries" USING "gist" ("boundary");



CREATE INDEX "idx_geocode_lock" ON "public"."geocode_worker_lock" USING "btree" ("is_running");



CREATE INDEX "idx_geocode_pending" ON "public"."reports" USING "btree" ("geocoded_status") WHERE ("geocoded_status" = 'pending'::"text");



-- History of one component, newest first (getMaintenanceHistory, last cleaned).
CREATE INDEX "idx_maintenance_component" ON "public"."maintenance" USING "btree" ("component_name", "performed_at" DESC);



CREATE INDEX "idx_maintenance_agency_id" ON "public"."maintenance" USING "btree" ("agency_id");



CREATE INDEX "idx_maintenance_performed_by" ON "public"."maintenance" USING "btree" ("performed_by");



CREATE INDEX "idx_reports_resolved_by_maintenance_id" ON "public"."reports" USING "btree" ("resolved_by_maintenance_id");



CREATE INDEX "idx_reports_component_id" ON "public"."reports" USING "btree" ("component_id");



CREATE INDEX "idx_profiles_agency_id" ON "public"."profiles" USING "btree" ("agency_id");



CREATE INDEX "idx_reports_user_id" ON "public"."reports" USING "btree" ("user_id");



CREATE INDEX "idx_reports_reviewed_by" ON "public"."reports" USING "btree" ("reviewed_by");



CREATE INDEX "idx_reports_created_at" ON "public"."reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reports_priority" ON "public"."reports" USING "btree" ("priority");



CREATE INDEX "idx_reports_status" ON "public"."reports" USING "btree" ("status");



CREATE INDEX "idx_reports_zone" ON "public"."reports" USING "btree" ("zone");



CREATE INDEX "inlets_geom_geom_idx" ON "public"."inlets" USING "gist" ("geom");



CREATE INDEX "man_pipes_geom_geom_idx" ON "public"."man_pipes" USING "gist" ("geom");



CREATE INDEX "outlets_geom_geom_idx" ON "public"."outlets" USING "gist" ("geom");



CREATE INDEX "storm_drains_geom_geom_idx" ON "public"."storm_drains" USING "gist" ("geom");



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "protect_profile_privileges" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_profile_privileges"();



-- Geocoding runs on the hosted project only. This webhook calls the
-- geocodeWorker edge function, which fills reports.address and
-- geocoded_status and takes geocode_worker_lock. The function's source isn't
-- in this repo, and supabase/seed.sql disables this trigger locally, so local
-- reports stay 'pending' with no address and the UI shows "Unknown address".
-- reports.zone doesn't depend on it: update_report_zone takes it from the
-- coordinates. Kept until someone decides to bring geocodeWorker into the
-- repo or retire geocoding (AUTONOMOUS_RUN_PLAN.md, 2.D3).
CREATE OR REPLACE TRIGGER "trigger-geocode-on-insert" AFTER INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://jpwbdhksmnrtfutcmpht.supabase.co/functions/v1/geocodeWorker', 'POST', '{"Content-type":"application/json","Authorization":"Bearer <SERVICE_ROLE_JWT>"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "set_reporter_name" BEFORE INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_reporter_name"();



CREATE OR REPLACE TRIGGER "sync_reporter_name" AFTER UPDATE OF "full_name", "show_name_on_reports" ON "public"."profiles" FOR EACH ROW WHEN ((("old"."full_name" IS DISTINCT FROM "new"."full_name") OR ("old"."show_name_on_reports" IS DISTINCT FROM "new"."show_name_on_reports"))) EXECUTE FUNCTION "public"."sync_reporter_name"();



CREATE OR REPLACE TRIGGER "trigger_update_report_zone" BEFORE INSERT OR UPDATE OF "long", "lat" ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_report_zone"();



ALTER TABLE ONLY "public"."maintenance"
    ADD CONSTRAINT "maintenance_component_name_fkey" FOREIGN KEY ("component_name") REFERENCES "public"."components"("name");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."components"("name");



ALTER TABLE ONLY "public"."maintenance"
    ADD CONSTRAINT "maintenance_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."maintenance"
    ADD CONSTRAINT "maintenance_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_resolved_by_maintenance_id_fkey" FOREIGN KEY ("resolved_by_maintenance_id") REFERENCES "public"."maintenance"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



-- ---------------------------------------------------------------------------
-- Permissions. The private schema is not exposed through the API (only
-- public and graphql_public are, see config.toml), so its tables can't be
-- read by clients and its functions can only be reached from policies and
-- other functions. anon/authenticated need USAGE to evaluate policies that
-- call these helpers.
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS "private";

GRANT USAGE ON SCHEMA "private" TO "anon", "authenticated", "service_role";


-- Only the zone trigger (update_report_zone) uses this.
CREATE OR REPLACE FUNCTION "private"."extract_barangay_from_coordinates"("longitude" double precision, "latitude" double precision) RETURNS character varying
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public', 'extensions'
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


ALTER FUNCTION "private"."extract_barangay_from_coordinates"("longitude" double precision, "latitude" double precision) OWNER TO "postgres";


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
  -- An admin demoting themselves could leave an agency with no admin.
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You can''t change your own role or agency; ask another admin.'
      USING ERRCODE = '42501';
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


-- An agency's members, for its admin screen: name, sign-in email, role and
-- when the account was made. Admin only; the email comes from auth.users,
-- which clients can't read.
CREATE OR REPLACE FUNCTION "public"."agency_members"("p_agency_id" "uuid") RETURNS TABLE("id" "uuid", "full_name" "text", "email" "text", "role" "public"."user_role", "account_created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT private.can_manage_members() THEN
    RAISE EXCEPTION 'Only an admin can list an agency''s members.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT p.id, p.full_name, u.email::text, p.role, p.created_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.agency_id = p_agency_id
    ORDER BY p.role DESC, p.full_name NULLS LAST, p.id;
END;
$$;


ALTER FUNCTION "public"."agency_members"("p_agency_id" "uuid") OWNER TO "postgres";


-- Staff record work on a component. In one transaction this inserts the
-- maintenance row and moves the component's open reports along:
--   resolved     closes pending and in-progress reports,
--   in-progress  moves pending reports to in-progress.
-- Reports filed after the work, and reports staff rejected, are left alone.
-- This is the only way reports change status; clients can't update reports
-- directly.
CREATE OR REPLACE FUNCTION "public"."record_maintenance"("p_component_type" "public"."component_type", "p_component_name" "text", "p_status" "public"."maintenance_status", "p_description" "text" DEFAULT NULL::"text", "p_evidence_image" "text" DEFAULT NULL::"text") RETURNS "public"."maintenance"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  staff_agency uuid := private.current_agency_id();
  result public.maintenance;
BEGIN
  IF staff_agency IS NULL THEN
    RAISE EXCEPTION 'Only agency staff can record maintenance.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.maintenance
    (component_type, component_name, agency_id, performed_by, status, description, evidence_image)
  VALUES
    (p_component_type, p_component_name, staff_agency, auth.uid(), p_status,
     nullif(btrim(p_description), ''), p_evidence_image)
  RETURNING * INTO result;

  UPDATE public.reports
  SET status = p_status::text::public.report_status,
      resolved_by_maintenance_id = result.id,
      resolved_image = coalesce(p_evidence_image, resolved_image),
      resolved_at = CASE WHEN p_status = 'resolved' THEN result.performed_at ELSE resolved_at END
  WHERE component_id = p_component_name
    AND created_at <= result.performed_at
    AND review_status <> 'rejected'
    AND status = ANY (CASE WHEN p_status = 'resolved'
                           THEN ARRAY['pending', 'in-progress']::public.report_status[]
                           ELSE ARRAY['pending']::public.report_status[] END);

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."record_maintenance"("p_component_type" "public"."component_type", "p_component_name" "text", "p_status" "public"."maintenance_status", "p_description" "text", "p_evidence_image" "text") OWNER TO "postgres";


-- Signed-out callers never need these.
REVOKE ALL ON FUNCTION "public"."rotate_agency_join_code"("p_agency_id" "uuid") FROM PUBLIC, "anon";
REVOKE ALL ON FUNCTION "public"."join_agency"("p_code" "text") FROM PUBLIC, "anon";
REVOKE ALL ON FUNCTION "public"."leave_agency"() FROM PUBLIC, "anon";
REVOKE ALL ON FUNCTION "public"."set_member_agency"("p_user_id" "uuid", "p_agency_id" "uuid", "p_role" "public"."user_role") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."rotate_agency_join_code"("p_agency_id" "uuid") TO "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."record_maintenance"("p_component_type" "public"."component_type", "p_component_name" "text", "p_status" "public"."maintenance_status", "p_description" "text", "p_evidence_image" "text") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."record_maintenance"("p_component_type" "public"."component_type", "p_component_name" "text", "p_status" "public"."maintenance_status", "p_description" "text", "p_evidence_image" "text") TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."join_agency"("p_code" "text") TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."leave_agency"() TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."set_member_agency"("p_user_id" "uuid", "p_agency_id" "uuid", "p_role" "public"."user_role") TO "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."agency_members"("p_agency_id" "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."agency_members"("p_agency_id" "uuid") TO "authenticated", "service_role";


-- A user can insert, read and update only their own profile.
-- protect_profile_privileges stops them changing role or agency_id.
CREATE POLICY "Allow individual insert access" ON "public"."profiles" FOR INSERT WITH CHECK (((select "auth"."uid"()) = "id"));



CREATE POLICY "Allow individual read access" ON "public"."profiles" FOR SELECT USING (((select "auth"."uid"()) = "id"));



CREATE POLICY "Allow individual update access" ON "public"."profiles" FOR UPDATE USING (((select "auth"."uid"()) = "id")) WITH CHECK (((select "auth"."uid"()) = "id"));



CREATE POLICY "Enable read access for all users" ON "public"."agencies" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."inlets" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."man_pipes" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."outlets" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."storm_drains" FOR SELECT USING (true);



-- Anyone, signed in or not, may file a report, but only as a new pending
-- report under their own id (anonymous reports carry no user_id).
CREATE POLICY "Public insert reports" ON "public"."reports" FOR INSERT WITH CHECK ((("status" = 'pending'::"public"."report_status") AND ("user_id" IS NOT DISTINCT FROM ( SELECT "auth"."uid"() AS "uid")) AND ("resolved_by_maintenance_id" IS NULL) AND ("resolved_image" IS NULL)));



CREATE POLICY "Public select reports" ON "public"."reports" FOR SELECT USING (true);






ALTER TABLE "public"."agencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."components" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable read access for all users" ON "public"."components" FOR SELECT USING (true);


ALTER TABLE "public"."flood_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable read access for all users" ON "public"."flood_results" FOR SELECT USING (true);


-- Barangay polygons feed the zone trigger on every report, so only the
-- service role may change them (the seed loads them as postgres).
ALTER TABLE "public"."barangay_boundaries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable read access for all users" ON "public"."barangay_boundaries" FOR SELECT USING (true);


ALTER TABLE "public"."geocode_worker_lock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inlets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."man_pipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."outlets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable read access for all users" ON "public"."maintenance" FOR SELECT USING (true);


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


-- The app subscribes to report inserts and updates (subscribeToReportChanges).
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."reports";


ALTER TABLE "public"."storm_drains" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






REVOKE ALL ON FUNCTION "private"."extract_barangay_from_coordinates"("longitude" double precision, "latitude" double precision) FROM PUBLIC, "anon", "authenticated";
GRANT ALL ON FUNCTION "private"."extract_barangay_from_coordinates"("longitude" double precision, "latitude" double precision) TO "service_role";


















-- Trigger functions: triggers fire without EXECUTE, and nothing calls
-- these through the API.
REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC, "anon", "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_profile_privileges"() FROM PUBLIC, "anon", "authenticated";
GRANT ALL ON FUNCTION "public"."protect_profile_privileges"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_reporter_name"() FROM PUBLIC, "anon", "authenticated";
GRANT ALL ON FUNCTION "public"."set_reporter_name"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_reporter_name"() FROM PUBLIC, "anon", "authenticated";
GRANT ALL ON FUNCTION "public"."sync_reporter_name"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC, "anon", "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_report_zone"() FROM PUBLIC, "anon", "authenticated";
GRANT ALL ON FUNCTION "public"."update_report_zone"() TO "service_role";



























GRANT SELECT ON TABLE "public"."components" TO "anon";
GRANT SELECT ON TABLE "public"."components" TO "authenticated";
GRANT ALL ON TABLE "public"."components" TO "service_role";
GRANT SELECT ON TABLE "public"."component_locations" TO "anon";
GRANT SELECT ON TABLE "public"."component_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."component_locations" TO "service_role";
GRANT SELECT ON TABLE "public"."flood_results" TO "anon";
GRANT SELECT ON TABLE "public"."flood_results" TO "authenticated";
GRANT ALL ON TABLE "public"."flood_results" TO "service_role";
-- Reference data: the default privileges grant ALL; clients only read.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."components" FROM "anon", "authenticated";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."component_locations" FROM "anon", "authenticated";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."flood_results" FROM "anon", "authenticated";



-- Client table privileges are only what the app uses: revoke what
-- Supabase's defaults granted, then grant back. RLS still filters on top;
-- the grants also stop TRUNCATE, which RLS doesn't cover.
REVOKE ALL ON TABLE "public"."agencies" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."agencies" TO "anon";
GRANT SELECT ON TABLE "public"."agencies" TO "authenticated";
GRANT ALL ON TABLE "public"."agencies" TO "service_role";



GRANT SELECT ON TABLE "public"."barangay_boundaries" TO "anon";
GRANT SELECT ON TABLE "public"."barangay_boundaries" TO "authenticated";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."barangay_boundaries" FROM "anon", "authenticated";
REVOKE ALL ON SEQUENCE "public"."barangay_boundaries_id_seq" FROM "anon", "authenticated";
GRANT ALL ON TABLE "public"."barangay_boundaries" TO "service_role";



GRANT ALL ON SEQUENCE "public"."barangay_boundaries_id_seq" TO "service_role";



REVOKE ALL ON TABLE "public"."geocode_worker_lock" FROM "anon", "authenticated";
GRANT ALL ON TABLE "public"."geocode_worker_lock" TO "service_role";



REVOKE ALL ON TABLE "public"."inlets" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."inlets" TO "anon";
GRANT SELECT ON TABLE "public"."inlets" TO "authenticated";
GRANT ALL ON TABLE "public"."inlets" TO "service_role";



REVOKE ALL ON SEQUENCE "public"."inlets_gid_seq" FROM "anon", "authenticated";
GRANT ALL ON SEQUENCE "public"."inlets_gid_seq" TO "service_role";






REVOKE ALL ON TABLE "public"."man_pipes" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."man_pipes" TO "anon";
GRANT SELECT ON TABLE "public"."man_pipes" TO "authenticated";
GRANT ALL ON TABLE "public"."man_pipes" TO "service_role";



REVOKE ALL ON SEQUENCE "public"."man_pipes_gid_seq" FROM "anon", "authenticated";
GRANT ALL ON SEQUENCE "public"."man_pipes_gid_seq" TO "service_role";






-- Signed-out visitors don't see which staff member did the work.
REVOKE ALL ON TABLE "public"."maintenance" FROM "anon";
GRANT SELECT ("id", "created_at", "performed_at", "component_name", "agency_id", "description", "evidence_image", "component_type", "status", "verification_status") ON TABLE "public"."maintenance" TO "anon";
GRANT SELECT ON TABLE "public"."maintenance" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance" TO "service_role";
-- Default privileges grant ALL; writes go through record_maintenance only.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."maintenance" FROM "anon", "authenticated";



REVOKE ALL ON TABLE "public"."outlets" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."outlets" TO "anon";
GRANT SELECT ON TABLE "public"."outlets" TO "authenticated";
GRANT ALL ON TABLE "public"."outlets" TO "service_role";



REVOKE ALL ON SEQUENCE "public"."outlets_gid_seq" FROM "anon", "authenticated";
GRANT ALL ON SEQUENCE "public"."outlets_gid_seq" TO "service_role";






REVOKE ALL ON TABLE "public"."profiles" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."profiles" TO "anon";
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";






REVOKE ALL ON TABLE "public"."reports" FROM "anon", "authenticated";
-- Signed-out visitors read every column except who filed the report
-- (user_id), where the reporter stood (photo_lat/photo_lon) and which staff
-- member reviewed it (reviewed_by). A new column is hidden from them until
-- it is added here; realtime leaves ungranted columns out of its payloads.
GRANT INSERT ON TABLE "public"."reports" TO "anon";
GRANT SELECT ("id", "created_at", "category", "description", "image", "reporter_name", "status", "component_id", "long", "lat", "geocoded_status", "address", "priority", "zone", "resolved_by_maintenance_id", "resolved_image", "resolved_at", "photo_taken_at", "photo_distance_m", "reviewed_at", "review_note", "photo_check", "review_status") ON TABLE "public"."reports" TO "anon";
GRANT SELECT, INSERT ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



REVOKE ALL ON TABLE "public"."storm_drains" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."storm_drains" TO "anon";
GRANT SELECT ON TABLE "public"."storm_drains" TO "authenticated";
GRANT ALL ON TABLE "public"."storm_drains" TO "service_role";



REVOKE ALL ON SEQUENCE "public"."storm_drains_gid_seq" FROM "anon", "authenticated";
GRANT ALL ON SEQUENCE "public"."storm_drains_gid_seq" TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
-- New tables, views, sequences and functions grant nothing to anon or
-- authenticated (Supabase's own defaults grant them ALL). Grant each object
-- explicitly where it is defined. Declarative sync does not diff default
-- privileges: the migration that introduced this block
-- (20260929*_close_unused_grants) carries them by hand.
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon", "authenticated";
-- Postgres itself lets PUBLIC execute every new function; that default is
-- global, so it is revoked without IN SCHEMA.
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







