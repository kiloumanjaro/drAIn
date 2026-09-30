SET local check_function_bodies = off;

CREATE EXTENSION "pg_net" SCHEMA "extensions";

CREATE EXTENSION "postgis" SCHEMA "extensions";

CREATE SEQUENCE "public"."barangay_boundaries_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."inlets_gid_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."man_pipes_gid_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."outlets_gid_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."storm_drains_gid_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE TABLE "public"."100YR" (
  "Node_ID"                       text             NOT NULL,
  "Vulnerability_Category"        text,
  "Vulnerability_Rank"            bigint,
  "Cluster"                       bigint,
  "Cluster_Score"                 double precision,
  "YR"                            text,
  "Time_After_Raining_min"        double precision,
  "Hours Flooded"                 double precision,
  "Maximum Rate (CMS)"            double precision,
  "Time of Max (hr:min)"          bigint,
  "Total Flood Volume (10^6 ltr)" double precision,
  CONSTRAINT "100YR_pkey" PRIMARY KEY ("Node_ID")
);

ALTER TABLE "public"."100YR"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."10YR" (
  "Node_ID"                       text             NOT NULL,
  "Vulnerability_Category"        text,
  "Vulnerability_Rank"            bigint,
  "Cluster"                       bigint,
  "Cluster_Score"                 double precision,
  "YR"                            text,
  "Time_After_Raining_min"        double precision,
  "Hours Flooded"                 double precision,
  "Maximum Rate (CMS)"            double precision,
  "Time of Max (hr:min)"          bigint,
  "Total Flood Volume (10^6 ltr)" double precision,
  CONSTRAINT "10YR_pkey" PRIMARY KEY ("Node_ID")
);

ALTER TABLE "public"."10YR"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."15YR" (
  "Node_ID"                       text             NOT NULL,
  "Vulnerability_Category"        text,
  "Vulnerability_Rank"            bigint,
  "Cluster"                       bigint,
  "Cluster_Score"                 double precision,
  "YR"                            text,
  "Time_After_Raining_min"        double precision,
  "Hours Flooded"                 double precision,
  "Maximum Rate (CMS)"            double precision,
  "Time of Max (hr:min)"          bigint,
  "Total Flood Volume (10^6 ltr)" double precision,
  CONSTRAINT "15YR_pkey" PRIMARY KEY ("Node_ID")
);

ALTER TABLE "public"."15YR"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."20YR" (
  "Node_ID"                       text             NOT NULL,
  "Vulnerability_Category"        text,
  "Vulnerability_Rank"            bigint,
  "Cluster"                       bigint,
  "Cluster_Score"                 double precision,
  "YR"                            text,
  "Time_After_Raining_min"        double precision,
  "Hours Flooded"                 double precision,
  "Maximum Rate (CMS)"            double precision,
  "Time of Max (hr:min)"          bigint,
  "Total Flood Volume (10^6 ltr)" double precision,
  CONSTRAINT "20YR_pkey" PRIMARY KEY ("Node_ID")
);

ALTER TABLE "public"."20YR"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."25YR" (
  "Node_ID"                       text             NOT NULL,
  "Vulnerability_Category"        text,
  "Vulnerability_Rank"            bigint,
  "Cluster"                       bigint,
  "Cluster_Score"                 double precision,
  "YR"                            text,
  "Time_After_Raining_min"        double precision,
  "Hours Flooded"                 double precision,
  "Maximum Rate (CMS)"            double precision,
  "Time of Max (hr:min)"          bigint,
  "Total Flood Volume (10^6 ltr)" double precision,
  CONSTRAINT "25YR_pkey" PRIMARY KEY ("Node_ID")
);

ALTER TABLE "public"."25YR"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."2YR" (
  "Node_ID"                       text,
  "Vulnerability_Category"        text,
  "Vulnerability_Rank"            bigint,
  "Cluster"                       bigint,
  "Cluster_Score"                 double precision,
  "YR"                            text,
  "Time_After_Raining_min"        double precision,
  "Hours Flooded"                 double precision,
  "Maximum Rate (CMS)"            double precision,
  "Time of Max (hr:min)"          bigint,
  "Total Flood Volume (10^6 ltr)" double precision
);

ALTER TABLE "public"."2YR"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."50YR" (
  "Node_ID"                       text             NOT NULL,
  "Vulnerability_Category"        text,
  "Vulnerability_Rank"            bigint,
  "Cluster"                       bigint,
  "Cluster_Score"                 double precision,
  "YR"                            text,
  "Time_After_Raining_min"        double precision,
  "Hours Flooded"                 double precision,
  "Maximum Rate (CMS)"            double precision,
  "Time of Max (hr:min)"          bigint,
  "Total Flood Volume (10^6 ltr)" double precision,
  CONSTRAINT "50YR_pkey" PRIMARY KEY ("Node_ID")
);

ALTER TABLE "public"."50YR"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."5YR" (
  "Node_ID"                       text             NOT NULL,
  "Vulnerability_Category"        text,
  "Vulnerability_Rank"            bigint,
  "Cluster"                       bigint,
  "Cluster_Score"                 double precision,
  "YR"                            text,
  "Time_After_Raining_min"        double precision,
  "Hours Flooded"                 double precision,
  "Maximum Rate (CMS)"            double precision,
  "Time of Max (hr:min)"          bigint,
  "Total Flood Volume (10^6 ltr)" double precision,
  CONSTRAINT "5YR_pkey" PRIMARY KEY ("Node_ID")
);

ALTER TABLE "public"."5YR"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."agencies" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"      timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name"            text                     NOT NULL,
  "contact_details" jsonb,
  CONSTRAINT "agencies_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."agencies"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."barangay_boundaries" (
  "id"                 integer                            NOT NULL DEFAULT nextval('public.barangay_boundaries_id_seq'::regclass),
  "name"               character varying(255)             NOT NULL,
  "boundary"           extensions.geography(Polygon,4326) NOT NULL,
  "population_count"   character varying(50),
  "population_density" character varying(50),
  "land_area"          character varying(50),
  "created_at"         timestamp without time zone        DEFAULT now(),
  CONSTRAINT "barangay_boundaries_name_key" UNIQUE (name),
  CONSTRAINT "barangay_boundaries_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."geocode_worker_lock" (
  "id"         integer                  NOT NULL DEFAULT 1,
  "is_running" boolean                  DEFAULT false,
  "started_at" timestamp with time zone,
  "started_by" text,
  CONSTRAINT "geocode_worker_lock_pkey" PRIMARY KEY (id),
  CONSTRAINT "single_row" CHECK ((id = 1))
);

ALTER TABLE "public"."geocode_worker_lock"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."inlets_maintenance" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"          timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_cleaned_at"     timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "agency_id"           uuid                     NOT NULL,
  "represented_by"      uuid                     NOT NULL,
  "in_name"             character varying        NOT NULL,
  "addressed_report_id" uuid,
  "status"              text,
  "description"         text                     DEFAULT 'No Comments'::text,
  "evidence_image"      text,
  CONSTRAINT "inlets_maintenance_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."inlets_maintenance"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."inlets" (
  "gid"        integer                              NOT NULL DEFAULT nextval('public.inlets_gid_seq'::regclass),
  "geom"       extensions.geometry(MultiPoint,4326),
  "x"          double precision,
  "y"          double precision,
  "inv_elev"   double precision,
  "maxdepth"   double precision,
  "length"     double precision,
  "height"     double precision,
  "weir_coeff" double precision,
  "in_type"    integer,
  "name"       character varying,
  "clogfac"    integer,
  "clogtime"   integer,
  "fplain_080" double precision,
  CONSTRAINT "inlets_pk" PRIMARY KEY (gid)
);

ALTER TABLE "public"."inlets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."man_pipes_maintenance" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"          timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_cleaned_at"     timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "agency_id"           uuid                     NOT NULL,
  "represented_by"      uuid                     NOT NULL,
  "name"                character varying        NOT NULL,
  "addressed_report_id" uuid,
  "status"              text,
  "description"         text                     DEFAULT 'No Comments'::text,
  "evidence_image"      text,
  CONSTRAINT "man_pipes_maintenance_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."man_pipes_maintenance"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."man_pipes" (
  "gid"        integer                            NOT NULL DEFAULT nextval('public.man_pipes_gid_seq'::regclass),
  "geom"       extensions.geometry(Geometry,4326),
  "type"       character varying,
  "length"     double precision,
  "width"      double precision,
  "height"     double precision,
  "pipe_shape" character varying,
  "pipe_lngth" double precision,
  "mannings"   double precision,
  "barrels"    integer,
  "name"       character varying,
  "clogper"    integer,
  "clogtime"   integer,
  CONSTRAINT "man_pipes_pk" PRIMARY KEY (gid)
);

ALTER TABLE "public"."man_pipes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."outlets_maintenance" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"          timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_cleaned_at"     timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "agency_id"           uuid                     NOT NULL,
  "represented_by"      uuid                     NOT NULL,
  "out_name"            character varying        NOT NULL,
  "addressed_report_id" uuid,
  "status"              text,
  "description"         text                     DEFAULT 'No Comments'::text,
  "evidence_image"      text,
  CONSTRAINT "outlets_maintenance_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."outlets_maintenance"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."outlets" (
  "gid"        integer                              NOT NULL DEFAULT nextval('public.outlets_gid_seq'::regclass),
  "geom"       extensions.geometry(MultiPoint,4326),
  "join_count" integer,
  "target_fid" integer,
  "inv_elev"   double precision,
  "allowq"     integer,
  "flapgate"   integer,
  "x"          double precision,
  "y"          double precision,
  "name"       character varying,
  "fplain_080" double precision,
  CONSTRAINT "outlets_pk" PRIMARY KEY (gid)
);

ALTER TABLE "public"."outlets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "full_name"  text,
  "avatar_url" text,
  "agency_id"  uuid,
  "role"       character varying        NOT NULL DEFAULT 'user'::character varying,
  "id"         uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."report_comments" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "report_id"  uuid                     NOT NULL,
  "user_id"    uuid                     NOT NULL,
  "content"    text                     NOT NULL,
  CONSTRAINT "report_comments_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."report_comments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reports" (
  "id"                           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"                   timestamp with time zone NOT NULL DEFAULT now(),
  "category"                     character varying,
  "description"                  character varying,
  "image"                        text,
  "reporter_name"                character varying,
  "status"                       character varying        NOT NULL,
  "component_id"                 text,
  "long"                         double precision,
  "lat"                          double precision,
  "geocoded_status"              text                     DEFAULT 'pending'::text,
  "address"                      text,
  "user_id"                      uuid,
  "priority"                     text                     DEFAULT 'low'::text,
  "zone"                         character varying(255),
  "resolved_by_maintenance_id"   uuid,
  "resolved_by_maintenance_type" text,
  "resolved_image"               text,
  CONSTRAINT "Report_pkey" PRIMARY KEY (id),
  CONSTRAINT "reports_geocoded_status_check" CHECK ((geocoded_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]))),
  CONSTRAINT "reports_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);

ALTER TABLE "public"."reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."storm_drains_maintenance" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"          timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_cleaned_at"     timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "agency_id"           uuid                     NOT NULL,
  "represented_by"      uuid                     NOT NULL,
  "in_name"             character varying        NOT NULL,
  "addressed_report_id" uuid,
  "status"              text,
  "description"         text                     DEFAULT 'No Comments'::text,
  "evidence_image"      text,
  CONSTRAINT "storm_drains_maintenance_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."storm_drains_maintenance"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."storm_drains" (
  "gid"        integer                              NOT NULL DEFAULT nextval('public.storm_drains_gid_seq'::regclass),
  "geom"       extensions.geometry(MultiPoint,4326),
  "invelev"    double precision,
  "x"          double precision,
  "y"          double precision,
  "clog_per"   integer,
  "clogtime"   integer,
  "weir_coeff" double precision,
  "length"     double precision,
  "height"     double precision,
  "max_depth"  double precision,
  "name"       character varying,
  "clogfac"    integer,
  "id"         integer,
  "namenum"    integer,
  "fplain_080" double precision,
  CONSTRAINT "storm_drains_pk" PRIMARY KEY (gid)
);

ALTER TABLE "public"."storm_drains"
  ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."barangay_boundaries_id_seq" OWNED BY "public"."barangay_boundaries"."id";

ALTER SEQUENCE "public"."inlets_gid_seq" OWNED BY "public"."inlets"."gid";

ALTER SEQUENCE "public"."man_pipes_gid_seq" OWNED BY "public"."man_pipes"."gid";

ALTER SEQUENCE "public"."outlets_gid_seq" OWNED BY "public"."outlets"."gid";

ALTER SEQUENCE "public"."storm_drains_gid_seq" OWNED BY "public"."storm_drains"."gid";

CREATE TYPE "public"."asset_point_type" AS ENUM (
  'inlet',
  'outlet',
  'stormdrain'
);

CREATE TYPE "public"."drainage_status" AS ENUM (
  'Clean',
  'Needs_Cleaning',
  'Clogged',
  'Damaged',
  'Overflowing'
);

CREATE TYPE "public"."maintenance_type" AS ENUM (
  'Cleaning',
  'Repair',
  'Inspection',
  'Unclogging'
);

CREATE TYPE "public"."report_status" AS ENUM (
  'pending',
  'received',
  'action_taken',
  'resolved',
  'rejected'
);

CREATE OR REPLACE FUNCTION public.extract_barangay_from_address (
  address_text text
)
  RETURNS character varying
  LANGUAGE plpgsql
  IMMUTABLE
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.extract_barangay_from_coordinates (
  longitude double precision,
  latitude  double precision
)
  RETURNS character varying
  LANGUAGE plpgsql
  STABLE
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
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    -- If the client sends a role, use it. Otherwise, use 'user'.
    COALESCE(new.raw_user_meta_data ->> 'role', 'user')
  );
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_role_update()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  -- Check if the user is trying to change their role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- You can check if the user is an admin here if you want to allow admins to change roles
    -- For now, we block all changes.
    RAISE EXCEPTION 'You are not allowed to change your role.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_report_zone()
  RETURNS TRIGGER
  LANGUAGE plpgsql
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

ALTER TABLE "public"."inlets_maintenance"
  ADD CONSTRAINT "inlets_maintenance_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES public.agencies(id);

ALTER TABLE "public"."man_pipes_maintenance"
  ADD CONSTRAINT "man_pipes_maintenance_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES public.agencies(id);

ALTER TABLE "public"."outlets_maintenance"
  ADD CONSTRAINT "outlets_maintenance_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES public.agencies(id);

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES public.agencies(id);

ALTER TABLE "public"."inlets_maintenance"
  ADD CONSTRAINT "inlets_maintenance_addressed_report_id_fkey" FOREIGN KEY (addressed_report_id) REFERENCES public.reports(id) ON DELETE SET NULL;

ALTER TABLE "public"."man_pipes_maintenance"
  ADD CONSTRAINT "man_pipes_maintenance_addressed_report_id_fkey" FOREIGN KEY (addressed_report_id) REFERENCES public.reports(id) ON DELETE SET NULL;

ALTER TABLE "public"."outlets_maintenance"
  ADD CONSTRAINT "outlets_maintenance_addressed_report_id_fkey" FOREIGN KEY (addressed_report_id) REFERENCES public.reports(id);

ALTER TABLE "public"."report_comments"
  ADD CONSTRAINT "report_comments_report_id_fkey" FOREIGN KEY (report_id) REFERENCES public.reports(id);

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."storm_drains_maintenance"
  ADD CONSTRAINT "storm_drains_maintenance_addressed_report_id_fkey" FOREIGN KEY (addressed_report_id) REFERENCES public.reports(id);

ALTER TABLE "public"."storm_drains_maintenance"
  ADD CONSTRAINT "storm_drains_maintenance_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES public.agencies(id);

CREATE INDEX "100_yr_node_id" ON public."100YR" USING btree ("Node_ID");

CREATE INDEX "10_yr_node_id" ON public."10YR" USING btree ("Node_ID");

CREATE INDEX "15_yr_node_id" ON public."15YR" USING btree ("Node_ID");

CREATE INDEX "20_yr_node_id" ON public."20YR" USING btree ("Node_ID");

CREATE INDEX "25_yr_node_id" ON public."25YR" USING btree ("Node_ID");

CREATE INDEX "2_yr_node_id" ON public."2YR" USING btree ("Node_ID");

CREATE INDEX "50_yr_node_id" ON public."50YR" USING btree ("Node_ID");

CREATE INDEX "5_yr_node_id" ON public."5YR" USING btree ("Node_ID");

CREATE INDEX idx_barangay_boundary_gist ON public.barangay_boundaries USING gist (boundary);

CREATE INDEX idx_geocode_lock ON public.geocode_worker_lock USING btree (is_running);

CREATE INDEX idx_geocode_pending ON public.reports USING btree (geocoded_status)
  WHERE (geocoded_status = 'pending'::text);

CREATE INDEX idx_report_category ON public.reports USING btree (category)
  WHERE ((category)::text = 'inlet'::text);

CREATE INDEX idx_reports_component_id ON public.reports USING btree (component_id);

CREATE INDEX idx_reports_created_at ON public.reports USING btree (created_at DESC);

CREATE INDEX idx_reports_priority ON public.reports USING btree (priority);

CREATE INDEX idx_reports_status ON public.reports USING btree (status);

CREATE INDEX idx_reports_zone ON public.reports USING btree (zone);

CREATE INDEX inlets_geom_geom_idx ON public.inlets USING gist (geom);

CREATE INDEX man_pipes_geom_geom_idx ON public.man_pipes USING gist (geom);

CREATE INDEX outlets_geom_geom_idx ON public.outlets USING gist (geom);

CREATE INDEX storm_drains_geom_geom_idx ON public.storm_drains USING gist (geom);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_update();

CREATE TRIGGER "trigger-geocode-on-insert"
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION
    supabase_functions.http_request('https://jpwbdhksmnrtfutcmpht.supabase.co/functions/v1/geocodeWorker', 'POST',
    '{"Content-type":"application/json","Authorization":"Bearer <SERVICE_ROLE_JWT>"}', '{}', '5000');

CREATE TRIGGER trigger_update_report_zone
  BEFORE INSERT OR UPDATE OF long, lat ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_report_zone();

CREATE POLICY "Enable read access for all users" ON "public"."100YR"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."10YR"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."15YR"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."20YR"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."25YR"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."2YR"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."50YR"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."5YR"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."agencies"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."inlets"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."inlets_maintenance"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."inlets_maintenance"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."man_pipes"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."man_pipes_maintenance"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."man_pipes_maintenance"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."outlets"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."outlets_maintenance"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."outlets_maintenance"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."report_comments"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Public insert report comments" ON "public"."report_comments"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."reports"
  FOR DELETE
  TO PUBLIC
  USING (true);

CREATE POLICY "Public insert reports" ON "public"."reports"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Public select reports" ON "public"."reports"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Public update reports" ON "public"."reports"
  FOR UPDATE
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."storm_drains"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."storm_drains_maintenance"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."storm_drains_maintenance"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow authenticated users to upload their own avatars" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'Avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Allow public read access to avatars" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'Avatars'::text));

CREATE POLICY "Public insert access" ON "storage"."objects"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((bucket_id = 'ReportImage'::text));

CREATE POLICY "Public read access" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'ReportImage'::text));

CREATE POLICY "Public update access" ON "storage"."objects"
  FOR UPDATE
  TO PUBLIC
  USING ((bucket_id = 'ReportImage'::text))
  WITH CHECK ((bucket_id = 'ReportImage'::text));

COMMENT ON COLUMN "public"."inlets_maintenance"."description" IS 'agency comments';

COMMENT ON COLUMN "public"."man_pipes_maintenance"."description" IS 'agency comments';

COMMENT ON COLUMN "public"."outlets_maintenance"."description" IS 'agency comments';

COMMENT ON COLUMN "public"."reports"."priority" IS 'Priority level: low, medium, high, critical (manual assignment)';

COMMENT ON COLUMN "public"."reports"."zone" IS 'Barangay/zone extracted from address for GeoJSON matching';

COMMENT ON COLUMN "public"."storm_drains_maintenance"."description" IS 'agency comments';

COMMENT ON EXTENSION "pg_net" IS 'Async HTTP';

COMMENT ON EXTENSION "postgis" IS 'PostGIS geometry and geography spatial types and functions';

GRANT EXECUTE ON FUNCTION "public"."extract_barangay_from_address"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."extract_barangay_from_coordinates"(double precision, double precision) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_closest_inlet"(double precision, double precision) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_closest_man_pipe"(double precision, double precision) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_closest_outlet"(double precision, double precision) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_closest_storm_drain"(double precision, double precision) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_component_by_category"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."prevent_role_update"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."update_report_zone"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."barangay_boundaries_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."inlets_gid_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."man_pipes_gid_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."outlets_gid_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."storm_drains_gid_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."100YR" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."10YR" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."15YR" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."20YR" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."25YR" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."2YR" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."50YR" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."5YR" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."agencies" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."barangay_boundaries" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."geocode_worker_lock" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inlets" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inlets_maintenance" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."man_pipes" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."man_pipes_maintenance" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."outlets" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."outlets_maintenance" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_comments" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reports" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."storm_drains" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."storm_drains_maintenance" TO "anon", "authenticated", "postgres", "service_role";

GRANT USAGE ON TYPE "public"."asset_point_type" TO "postgres";

GRANT USAGE ON TYPE "public"."drainage_status" TO "postgres";

GRANT USAGE ON TYPE "public"."maintenance_type" TO "postgres";

GRANT USAGE ON TYPE "public"."report_status" TO "postgres";

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id);

ALTER TABLE "public"."inlets_maintenance"
  ADD CONSTRAINT "inlets_maintenance_represented_by_fkey" FOREIGN KEY (represented_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."man_pipes_maintenance"
  ADD CONSTRAINT "man_pipes_maintenance_represented_by_fkey" FOREIGN KEY (represented_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."outlets_maintenance"
  ADD CONSTRAINT "outlets_maintenance_represented_by_fkey" FOREIGN KEY (represented_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."report_comments"
  ADD CONSTRAINT "report_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."storm_drains_maintenance"
  ADD CONSTRAINT "storm_drains_maintenance_represented_by_fkey" FOREIGN KEY (represented_by) REFERENCES public.profiles(id);

CREATE POLICY "Allow individual insert access" ON "public"."profiles"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Allow individual read access" ON "public"."profiles"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = id));

CREATE POLICY "Allow individual update access" ON "public"."profiles"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));
